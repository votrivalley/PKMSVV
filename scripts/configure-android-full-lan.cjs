'use strict';
/* Add private-IP Co-op mode to FULL Capacitor APK.
 * Offline game remains in the original Capacitor WebView; remote LAN game runs
 * only inside a separate Activity, never replacing origin or local save state.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const manifestPath=path.join(root,'android','app','src','main','AndroidManifest.xml');
let xml=fs.readFileSync(manifestPath,'utf8');
if(!xml.includes('android:name=".MainActivity"'))throw Error('Capacitor template changed');
if(!xml.includes('android:usesCleartextTraffic'))xml=xml.replace('<application','<application android:usesCleartextTraffic="true"');
if(!xml.includes('LANRoomActivity'))xml=xml.replace('</application>',
 '    <activity android:name=".LANRoomActivity" android:exported="false" android:screenOrientation="sensorLandscape" />\n    </application>');
fs.writeFileSync(manifestPath,xml);
const javaRoot=path.join(root,'android','app','src','main','java');
function seek(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
 const file=path.join(dir,item.name);if(item.isDirectory()){const x=seek(file);if(x)return x;}
 else if(item.name==='MainActivity.java')return file;
}return null;}
const main=seek(javaRoot);
if(!main)throw Error('Android MainActivity missing');
let source=fs.readFileSync(main,'utf8');
if(!source.includes('extends BridgeActivity')||!source.includes('registerPlugin(PKMSVVScreen.class)'))
 throw Error('Expected FULL Android Capacitor BridgeActivity');
const pkg=(source.match(/package\s+([\w.]+)\s*;/)||[])[1];
if(!pkg)throw Error('Android Java package missing');
source=source.replace('registerPlugin(PKMSVVScreen.class);',
 'registerPlugin(PKMSVVScreen.class);\n    registerPlugin(PKMSVVLAN.class);');
fs.writeFileSync(main,source);

const pluginJava="package __PACKAGE__;\n\nimport android.app.AlertDialog;\nimport android.content.Context;\nimport android.content.Intent;\nimport android.text.InputType;\nimport android.widget.EditText;\nimport android.widget.Toast;\nimport com.getcapacitor.Plugin;\nimport com.getcapacitor.PluginCall;\nimport com.getcapacitor.PluginMethod;\nimport com.getcapacitor.annotation.CapacitorPlugin;\n\n@CapacitorPlugin(name=\"PKMSVVLAN\")\npublic class PKMSVVLAN extends Plugin {\n  public static boolean validPrivateIP(String ip) {\n    if(ip == null || !ip.matches(\"^[0-9]{1,3}(\\\\.[0-9]{1,3}){3}$\"))return false;\n    String[] p=ip.split(\"\\\\.\");\n    int[] n=new int[4];\n    try {for(int i=0;i<4;i++){n[i]=Integer.parseInt(p[i]);if(n[i]<0||n[i]>255)return false;}}\n    catch(Exception error){return false;}\n    return n[0]==10 || (n[0]==172 && n[1]>=16 && n[1]<=31) ||\n      (n[0]==192 && n[1]==168);\n  }\n  @PluginMethod public void open(PluginCall call) {\n    getActivity().runOnUiThread(()->{\n      EditText input=new EditText(getActivity());\n      input.setSingleLine(true);\n      input.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);\n      String saved=getActivity().getSharedPreferences(\"pkmsvv_lan\",Context.MODE_PRIVATE).getString(\"host\",\"\");\n      input.setText(saved);\n      input.setHint(\"192.168.1.20\");\n      new AlertDialog.Builder(getActivity())\n        .setTitle(\"Co-op · LAN\")\n        .setMessage(\"PC Host phải đang chạy và cùng Wi-Fi. Nhập IPv4 của máy Host:\")\n        .setView(input)\n        .setNegativeButton(\"Hủy\",(dialog,which)->call.resolve())\n        .setPositiveButton(\"Kết nối\",(dialog,which)->{\n          String ip=input.getText().toString().trim();\n          if(!validPrivateIP(ip)){\n            Toast.makeText(getActivity(),\"Chỉ cho phép IPv4 nội bộ 10.x, 172.16–31.x, 192.168.x\",Toast.LENGTH_LONG).show();\n            call.reject(\"Địa chỉ IP nội bộ không hợp lệ.\");\n            return;\n          }\n          getActivity().getSharedPreferences(\"pkmsvv_lan\",Context.MODE_PRIVATE).edit().putString(\"host\",ip).apply();\n          Intent intent=new Intent(getActivity(),LANRoomActivity.class);\n          intent.putExtra(\"host_ip\",ip);\n          getActivity().startActivity(intent);\n          call.resolve();\n        })\n        .show();\n    });\n  }\n}\n";
const activityJava="package __PACKAGE__;\n\nimport android.app.Activity;\nimport android.os.Bundle;\nimport android.os.Build;\nimport android.content.Intent;\nimport android.net.Uri;\nimport android.graphics.Color;\nimport android.view.View;\nimport android.view.WindowManager;\nimport android.view.WindowInsets;\nimport android.view.WindowInsetsController;\nimport android.webkit.WebView;\nimport android.webkit.WebViewClient;\nimport android.webkit.WebChromeClient;\nimport android.webkit.WebSettings;\nimport android.webkit.WebResourceRequest;\nimport android.webkit.WebResourceResponse;\nimport android.webkit.WebResourceError;\nimport android.webkit.JavascriptInterface;\nimport android.webkit.ValueCallback;\nimport android.webkit.CookieManager;\nimport android.widget.Toast;\nimport java.io.ByteArrayInputStream;\nimport java.io.OutputStream;\nimport java.nio.charset.StandardCharsets;\nimport org.json.JSONObject;\n\npublic class LANRoomActivity extends Activity {\n  private static final int PORT=37816, EXPORT=711, IMPORT=712, MAX_SAVE=10*1024*1024;\n  private WebView web;\n  private String host=\"\",pendingSave;\n  private ValueCallback<Uri[]> upload;\n  private void immersive() {\n    getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);\n    View d=getWindow().getDecorView();\n    d.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|\n      View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_STABLE|\n      View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);\n    if(Build.VERSION.SDK_INT>=30&&getWindow().getInsetsController()!=null){\n      WindowInsetsController c=getWindow().getInsetsController();\n      c.hide(WindowInsets.Type.statusBars()|WindowInsets.Type.navigationBars());\n      c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);\n    }\n  }\n  private boolean localHost(Uri uri){\n    return uri!=null&&\"http\".equals(uri.getScheme())&&host.equals(uri.getHost())&&uri.getPort()==PORT;\n  }\n  @Override public void onCreate(Bundle saved) {\n    super.onCreate(saved);\n    host=getIntent().getStringExtra(\"host_ip\");\n    if(!PKMSVVLAN.validPrivateIP(host)){finish();return;}\n    immersive();\n    web=new WebView(this);\n    web.setBackgroundColor(Color.rgb(9,26,47));\n    WebSettings opt=web.getSettings();\n    opt.setJavaScriptEnabled(true);opt.setDomStorageEnabled(true);\n    opt.setMediaPlaybackRequiresUserGesture(false);\n    opt.setAllowFileAccess(false);opt.setAllowContentAccess(false);\n    opt.setJavaScriptCanOpenWindowsAutomatically(false);\n    opt.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);\n    if(Build.VERSION.SDK_INT>=26)opt.setSafeBrowsingEnabled(true);\n    CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);\n    web.addJavascriptInterface(new SaveBridge(),\"PKMSVVLANFiles\");\n    web.setWebChromeClient(new WebChromeClient(){\n      @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){\n        if(upload!=null)upload.onReceiveValue(null);\n        upload=callback;\n        Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);\n        i.addCategory(Intent.CATEGORY_OPENABLE);\n        i.setType(\"*/*\");\n        i.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{\"application/json\",\"text/plain\"});\n        try{startActivityForResult(i,IMPORT);return true;}\n        catch(Exception e){upload=null;callback.onReceiveValue(null);return false;}\n      }\n    });\n    web.setWebViewClient(new WebViewClient(){\n      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){\n        return !localHost(request.getUrl());\n      }\n      @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){\n        Uri u=request.getUrl();\n        if(u!=null&&(\"http\".equals(u.getScheme())||\"https\".equals(u.getScheme()))&&!localHost(u))\n          return new WebResourceResponse(\"text/plain\",\"UTF-8\",new ByteArrayInputStream(new byte[0]));\n        return null;\n      }\n      @Override public void onPageFinished(WebView view,String url){\n        if(localHost(Uri.parse(url)))view.evaluateJavascript(__INJECTED__,null);\n      }\n      @Override public void onReceivedError(WebView view,WebResourceRequest req,WebResourceError error){\n        if(req.isForMainFrame())Toast.makeText(LANRoomActivity.this,\n          \"Không kết nối PC Host. Kiểm tra IP, Wi-Fi và tường lửa Windows.\",Toast.LENGTH_LONG).show();\n      }\n    });\n    setContentView(web);\n    Toast.makeText(this,\"Co-op LAN: dùng nút Back để quay lại game Offline.\",Toast.LENGTH_LONG).show();\n    web.loadUrl(\"http://\"+host+\":\"+PORT+\"/\");\n  }\n  public final class SaveBridge {\n    @JavascriptInterface public void save(String text,String name){\n      if(text==null||text.length()>MAX_SAVE||name==null||!name.matches(\"[A-Za-z0-9._-]{1,100}\\\\.json\"))return;\n      try{if(!\"PKMSVV_SAVE\".equals(new JSONObject(text).optString(\"format\")))return;}\n      catch(Exception error){return;}\n      runOnUiThread(()->{\n        pendingSave=text;\n        Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);\n        i.addCategory(Intent.CATEGORY_OPENABLE);i.setType(\"application/json\");\n        i.putExtra(Intent.EXTRA_TITLE,name);\n        try{startActivityForResult(i,EXPORT);}\n        catch(Exception e){pendingSave=null;Toast.makeText(LANRoomActivity.this,\"Không mở được trình lưu save.\",Toast.LENGTH_LONG).show();}\n      });\n    }\n  }\n  @Override protected void onActivityResult(int request,int result,Intent data){\n    super.onActivityResult(request,result,data);\n    if(request==IMPORT){\n      if(upload!=null){upload.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null?\n        new Uri[]{data.getData()}:null);upload=null;}\n    }\n    if(request==EXPORT){\n      String text=pendingSave;pendingSave=null;\n      if(result==RESULT_OK&&data!=null&&data.getData()!=null&&text!=null){\n        try(OutputStream output=getContentResolver().openOutputStream(data.getData())){\n          if(output==null)throw new Exception(\"No output stream\");\n          output.write(text.getBytes(StandardCharsets.UTF_8));\n          Toast.makeText(this,\"Đã xuất file save JSON.\",Toast.LENGTH_LONG).show();\n        }catch(Exception error){Toast.makeText(this,\"Lỗi lưu file: \"+error.getMessage(),Toast.LENGTH_LONG).show();}\n      }\n    }\n  }\n  @Override public void onBackPressed(){\n    if(web!=null&&web.canGoBack())web.goBack();\n    else finish();\n  }\n  @Override public void onWindowFocusChanged(boolean focused){super.onWindowFocusChanged(focused);if(focused)immersive();}\n  @Override protected void onDestroy(){\n    if(upload!=null){upload.onReceiveValue(null);upload=null;}\n    if(web!=null){web.removeJavascriptInterface(\"PKMSVVLANFiles\");web.destroy();web=null;}\n    super.onDestroy();\n  }\n}\n";
const injected="(function(){\n if(window.__PKMSVVLANSaveHook)return;window.__PKMSVVLANSaveHook=true;\n var original=HTMLAnchorElement.prototype.click;\n HTMLAnchorElement.prototype.click=function(){\n  var name=String(this.download||''),href=String(this.href||'');\n  if(window.PKMSVVLANFiles&&/\\.json$/i.test(name)&&href.indexOf('blob:')===0){\n   fetch(href).then(function(r){return r.text();})\n    .then(function(s){window.PKMSVVLANFiles.save(s,name);})\n    .catch(function(e){alert('Không xuất được save: '+e.message);});\n   return;\n  }\n  return original.apply(this,arguments);\n };\n})();";


// Android discovers LAN rooms by UDP broadcast; users choose nearby Host,
// not a fixed IP. The PC stays the transport/room server for now.
const autoDiscoverJava=String.raw`
  private void openRoom(android.app.Activity activity, PluginCall call, String ip, int port, String role) {
    activity.getSharedPreferences(\"pkmsvv_lan\",android.content.Context.MODE_PRIVATE).edit()
      .putString(\"host\",ip).putInt(\"port\",port).apply();
    android.content.Intent intent=new android.content.Intent(activity,LANRoomActivity.class);
    intent.putExtra(\"host_ip\",ip);intent.putExtra(\"host_port\",port);
    String mode=call.getString(\"mode\",\"coop\");
    if(!java.util.Arrays.asList(\"coop\",\"royale\",\"eggrush\").contains(mode))mode=\"coop\";
    intent.putExtra(\"room_role\",role);intent.putExtra(\"room_mode\",mode);
    activity.startActivity(intent);call.resolve();
  }
  private void enterManual(PluginCall call,String role) {
    android.app.Activity a=getActivity();
    android.widget.EditText input=new android.widget.EditText(a);
    input.setSingleLine(true);input.setHint(\"192.168.1.168:37816\");
    input.setText(a.getSharedPreferences(\"pkmsvv_lan\",android.content.Context.MODE_PRIVATE)
      .getString(\"host\",\"\"));
    new android.app.AlertDialog.Builder(a).setTitle(\"LAN · Nhập địa chỉ thủ công\")
      .setMessage(\"Chỉ dùng khi tính năng tìm Host cùng Wi-Fi không hoạt động.\")
      .setView(input).setNegativeButton(\"Hủy\",(d,w)->call.resolve())
      .setPositiveButton(\"Vào LAN\",(d,w)->{
        String value=input.getText().toString().trim();
        String[] bits=value.split(\":\",-1);
        int port=37816;
        try{if(bits.length==2)port=Integer.parseInt(bits[1]);}catch(Exception e){call.reject(\"Cổng LAN không hợp lệ\");return;}
        if(bits.length>2||!validPrivateIP(bits[0])||port<1024||port>65535){
          call.reject(\"Địa chỉ LAN không hợp lệ\");return;
        }
        openRoom(a,call,bits[0],port,role);
      }).show();
  }
  private void chooseNearby(PluginCall call,String role) {
    android.app.Activity a=getActivity();
    new Thread(()->{
      java.util.LinkedHashMap<String,org.json.JSONObject> found=new java.util.LinkedHashMap<>();
      java.net.DatagramSocket socket=null;
      try{
        socket=new java.net.DatagramSocket();socket.setBroadcast(true);socket.setSoTimeout(260);
        byte[] query=\"PKMSVV_DISCOVER_V1\".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        java.util.LinkedHashSet<String> broadcasts=new java.util.LinkedHashSet<>();
        broadcasts.add(\"255.255.255.255\");
        java.util.Enumeration<java.net.NetworkInterface> networks=java.net.NetworkInterface.getNetworkInterfaces();
        while(networks!=null&&networks.hasMoreElements()){
          java.net.NetworkInterface ni=networks.nextElement();
          if(!ni.isUp()||ni.isLoopback())continue;
          for(java.net.InterfaceAddress ia:ni.getInterfaceAddresses())
            if(ia.getBroadcast()!=null)broadcasts.add(ia.getBroadcast().getHostAddress());
        }
        for(String ip:broadcasts){
          try{socket.send(new java.net.DatagramPacket(query,query.length,
            java.net.InetAddress.getByName(ip),37820));}catch(Exception ignored){}
        }
        long end=android.os.SystemClock.elapsedRealtime()+1800;
        byte[] data=new byte[2048];
        while(android.os.SystemClock.elapsedRealtime()<end){
          java.net.DatagramPacket reply=new java.net.DatagramPacket(data,data.length);
          try{socket.receive(reply);}catch(java.net.SocketTimeoutException timeout){continue;}
          org.json.JSONObject response=new org.json.JSONObject(new String(reply.getData(),
            reply.getOffset(),reply.getLength(),java.nio.charset.StandardCharsets.UTF_8));
          String ip=reply.getAddress().getHostAddress(),name=response.optString(\"name\",\"PC Host\");
          int port=response.optInt(\"port\",37816);
          if(\"pkmsvv-lan-v1\".equals(response.optString(\"service\"))&&validPrivateIP(ip)&&port>=1024&&port<=65535)
            found.put(ip+\":\"+port,response);
        }
      }catch(Exception error){android.util.Log.w(\"PKMSVVLAN\",\"LAN discovery unavailable\",error);}
      finally{if(socket!=null)socket.close();}
      a.runOnUiThread(()->{
        if(a.isFinishing()){call.resolve();return;}
        if(found.isEmpty()){
          new android.app.AlertDialog.Builder(a).setTitle(\"Không tìm thấy Host gần đây\")
           .setMessage(\"Hãy mở PC LAN Host, kết nối cùng Wi-Fi và cho phép mạng Private trong Windows Firewall. Mạng khách/AP isolation có thể chặn tìm phòng.\")
           .setPositiveButton(\"Quét lại\",(d,w)->chooseNearby(call,role))
           .setNeutralButton(\"Nhập IP dự phòng\",(d,w)->enterManual(call,role))
           .setNegativeButton(\"Quay lại\",(d,w)->call.resolve()).show();return;
        }
        java.util.ArrayList<String> addresses=new java.util.ArrayList<>(found.keySet());
        String[] labels=new String[addresses.size()];
        for(int i=0;i<addresses.size();i++)
          labels[i]=found.get(addresses.get(i)).optString(\"name\",\"PC Host\")+\" · Cùng Wi-Fi\";
        new android.app.AlertDialog.Builder(a).setTitle(role.equals(\"host\")?
          \"Tạo phòng · Chọn máy LAN\":\"Tham gia · Host gần đây\")
          .setItems(labels,(d,which)->{
            String[] bits=addresses.get(which).split(\":\");
            openRoom(a,call,bits[0],Integer.parseInt(bits[1]),role);
          })
          .setPositiveButton(\"Quét lại\",(d,w)->chooseNearby(call,role))
          .setNeutralButton(\"Nhập IP dự phòng\",(d,w)->enterManual(call,role))
          .setNegativeButton(\"Quay lại\",(d,w)->call.resolve()).show();
      });
    }).start();
  }
  @PluginMethod public void open(PluginCall call) {
    String role=call.getString(\"role\",\"join\");
    if(!java.util.Arrays.asList(\"host\",\"join\",\"ai\").contains(role))role=\"join\";
    final String chosen=role;
    getActivity().runOnUiThread(()->chooseNearby(call,chosen));
  }`;

const begin=pluginJava.indexOf('  @PluginMethod public void open(PluginCall call) {');
const end=pluginJava.indexOf('\n}\n',begin);
if(begin<0||end<0)throw Error('Native LAN plugin entrypoint drift');
const pluginNew=pluginJava.slice(0,begin)+autoDiscoverJava.replace(/\\\"/g,'"')+pluginJava.slice(end);
fs.writeFileSync(path.join(path.dirname(main),'PKMSVVLAN.java'),pluginNew.replaceAll('__PACKAGE__',pkg),'utf8');

let newActivity=activityJava;
newActivity=newActivity.replace('private static final int PORT=37816, EXPORT=711',
 'private static final int EXPORT=711');
newActivity=newActivity.replace('private String host="",pendingSave;',
 'private String host="",pendingSave; private int port=37816; private String roomRole="join"; private String roomMode="coop";');
newActivity=newActivity.replace('uri.getPort()==PORT','uri.getPort()==port');
newActivity=newActivity.replace('host=getIntent().getStringExtra("host_ip");',
 'host=getIntent().getStringExtra("host_ip");\n    port=getIntent().getIntExtra("host_port",37816);\n    roomRole=getIntent().getStringExtra("room_role");\n    roomMode=getIntent().getStringExtra("room_mode");');
newActivity=newActivity.replace('":"+PORT+"/"', '":"+port+"/"');
newActivity=newActivity.replace('web.loadUrl("http://"+host+":"+port+"/");',
 'web.loadUrl("http://"+host+":"+port+"/game/?pkmsvvRole="+roomRole+"&pkmsvvMode="+roomMode);');
fs.writeFileSync(path.join(path.dirname(main),'LANRoomActivity.java'),
 newActivity.replaceAll('__PACKAGE__',pkg).replace('__INJECTED__',JSON.stringify(injected)),'utf8');
console.log('PKMSVV FULL Android: private IPv4 LAN plugin, external Host WebView, SAF JSON save import/export installed.');
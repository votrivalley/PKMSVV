'use strict';
// A landscape mobile game: apply after 'npx cap add android' (fresh every CI run).
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const version=require('../package.json').version;
const [major,minor,patch]=version.split('.').map(Number);
const versionCode=major*1000000+minor*1000+patch;
if(!Number.isSafeInteger(versionCode)||versionCode<1)throw Error('Invalid Android release version');
const gradle=path.join(root,'android/app/build.gradle');
let config=fs.readFileSync(gradle,'utf8');
if(!/versionCode\s+\d+/.test(config)||!/versionName\s+"[^"]+"/.test(config))
 throw Error('Android version fields missing');
config=config.replace(/versionCode\s+\d+/,'versionCode '+versionCode)
 .replace(/versionName\s+"[^"]+"/,'versionName "'+version+'"');
fs.writeFileSync(gradle,config,'utf8');
const file=path.join(__dirname,'..','android','app','src','main','AndroidManifest.xml');
if(!fs.existsSync(file))throw Error('Native Android project not generated');
let xml=fs.readFileSync(file,'utf8');
const main='android:name=".MainActivity"';
if(!xml.includes(main))throw Error('Unexpected Capacitor native template');
if(!xml.includes('android:screenOrientation=')){
 xml=xml.replace(main,main+'\n            android:screenOrientation="sensorLandscape"');
}
fs.writeFileSync(file,xml,'utf8');
console.log('PKMSVV Android forced landscape orientation.');


// Native fullscreen control: the Fullscreen API can be restricted by WebView.
const mainJava=path.join(__dirname,'..','android','app','src','main','java');
function findMain(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,entry.name);
  if(entry.isDirectory()){const found=findMain(p);if(found)return found;}
  else if(entry.name==='MainActivity.java')return p;
 }
 return null;
}
const mainFile=findMain(mainJava);
if(!mainFile)throw Error('Android MainActivity.java not found');
const src=fs.readFileSync(mainFile,'utf8');
const packageMatch=src.match(/package\s+([\w.]+)\s*;/);
if(!packageMatch)throw Error('Android package declaration not found');
const pkg=packageMatch[1];
fs.writeFileSync(mainFile,[
 'package '+pkg+';',
 'import android.os.Bundle;',
 'import com.getcapacitor.BridgeActivity;',
 'public class MainActivity extends BridgeActivity {',
 '  @Override protected void onCreate(Bundle state){',
 '    registerPlugin(PKMSVVScreen.class);',
 '    super.onCreate(state);',
 '    PKMSVVScreen.reapply(this);',
 '  }',
 '  @Override public void onWindowFocusChanged(boolean focused){',
 '    super.onWindowFocusChanged(focused);',
 '    if(focused) PKMSVVScreen.reapply(this);',
 '  }',
 '}',''
].join('\n'),'utf8');
const nativeSource="package __PACKAGE__;\n\nimport android.app.Activity;\nimport android.content.Intent;\nimport android.net.Uri;\nimport android.os.Build;\nimport android.view.WindowInsets;\nimport android.view.WindowInsetsController;\nimport android.view.View;\nimport android.view.Window;\nimport android.view.WindowManager;\nimport com.getcapacitor.JSObject;\nimport com.getcapacitor.Plugin;\nimport com.getcapacitor.PluginCall;\nimport com.getcapacitor.PluginMethod;\nimport com.getcapacitor.annotation.CapacitorPlugin;\n\n@CapacitorPlugin(name = \"PKMSVVScreen\")\npublic class PKMSVVScreen extends Plugin {\n  private static volatile boolean immersive = true;\n  public static void reapply(Activity activity) { if (immersive) apply(activity,true); }\n  private static void apply(Activity activity,boolean enabled) {\n    immersive=enabled;\n    final Window window=activity.getWindow();\n    final View decor=window.getDecorView();\n    if(enabled) {\n      window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);\n      decor.setSystemUiVisibility(\n        View.SYSTEM_UI_FLAG_FULLSCREEN |\n        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |\n        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |\n        View.SYSTEM_UI_FLAG_LAYOUT_STABLE |\n        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |\n        View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION\n      );\n    } else {\n      window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);\n      decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);\n    }\n    // Newer Android versions use WindowInsetsController instead of legacy flags.\n    if (Build.VERSION.SDK_INT >= 30 && window.getInsetsController()!=null) {\n      WindowInsetsController bars=window.getInsetsController();\n      if (enabled) {\n        bars.hide(WindowInsets.Type.statusBars()|WindowInsets.Type.navigationBars());\n        bars.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);\n      } else {\n        bars.show(WindowInsets.Type.statusBars()|WindowInsets.Type.navigationBars());\n      }\n    }\n  }\n  @PluginMethod\n  public void openOnline(PluginCall call) {\n    getActivity().runOnUiThread(()->{\n      try {\n        Intent intent=new Intent(Intent.ACTION_VIEW,Uri.parse(\"https://pkmsvv-b84d2.web.app/\"));\n        intent.addCategory(Intent.CATEGORY_BROWSABLE);\n        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);\n        getActivity().startActivity(intent);\n        call.resolve();\n      } catch(Exception e) { call.reject(\"Không mở được trình duyệt Web Online.\",e); }\n    });\n  }\n  @PluginMethod\n  public void state(PluginCall call) {\n    JSObject result=new JSObject();\n    result.put(\"enabled\",immersive);\n    // Report VISIBLE system bars, not only the last requested immersive flag.\n    final View decor=getActivity().getWindow().getDecorView();\n    boolean fullscreen=immersive;\n    if (Build.VERSION.SDK_INT>=30 && decor.getRootWindowInsets()!=null) {\n      WindowInsets insets=decor.getRootWindowInsets();\n      fullscreen=!insets.isVisible(WindowInsets.Type.statusBars()) &&\n        !insets.isVisible(WindowInsets.Type.navigationBars());\n    } else {\n      int flags=decor.getSystemUiVisibility();\n      fullscreen=(flags & View.SYSTEM_UI_FLAG_FULLSCREEN)!=0 &&\n        (flags & View.SYSTEM_UI_FLAG_HIDE_NAVIGATION)!=0;\n    }\n    result.put(\"fullscreen\",fullscreen);\n    call.resolve(result);\n  }\n  @PluginMethod\n  public void toggle(PluginCall call) {\n    final Boolean requested=call.getBoolean(\"enabled\",true);\n    final boolean enabled=requested!=null && requested;\n    getActivity().runOnUiThread(()->{\n      apply(getActivity(),enabled);\n      JSObject result=new JSObject();\n      result.put(\"enabled\",enabled);\n      call.resolve(result);\n    });\n  }\n}\n";
fs.writeFileSync(path.join(path.dirname(mainFile),'PKMSVVScreen.java'),
  nativeSource.replace('__PACKAGE__',pkg),'utf8');
console.log('PKMSVV: Android native fullscreen bridge ready');

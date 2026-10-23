'use strict';
/* Small, sandbox-safe bridge. No arbitrary filesystem or IPC access. */
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('PKMSVVNative',{
 toggleFullscreen:()=>ipcRenderer.invoke('pkmsvv:toggle-fullscreen'),
 isFullscreen:()=>ipcRenderer.invoke('pkmsvv:is-fullscreen')
});

'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('PKMSVVLANDesktop',{
 connect:options=>ipcRenderer.invoke('pkmsvv:lan-connect',options)
});

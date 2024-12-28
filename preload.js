const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openExternalLink: (url) => shell.openExternal(url),

  loadApiCode: async () => ipcRenderer.invoke('load-api-code'),
  totalBalance: async () => ipcRenderer.invoke('get-total-balance'),
  saveApiCode: (api_code, api_name) => ipcRenderer.invoke('save-api-code', api_code, api_name),
  loadStudents: async () => ipcRenderer.invoke('load-all-students'),
  importExcelStudents: () => ipcRenderer.invoke('import-excel-students'),
  deleteStudent: (index) => ipcRenderer.invoke('delete-student', index),
  editStudent: (index, updatedData) => ipcRenderer.invoke('edit-student', index, updatedData),
  loadTeachers: async () => ipcRenderer.invoke('load-all-teachers'),
  importExcelTeachers: () => ipcRenderer.invoke('import-excel-teachers'),
  deleteTeacher: (index) => ipcRenderer.invoke('delete-teacher', index),
  editTeacher: (index, updatedData) => ipcRenderer.invoke('edit-teacher', index, updatedData),
  sendMessage: (messageData) => ipcRenderer.invoke('send-message', messageData),
  loadMessages: async () => ipcRenderer.invoke('load-all-messages'),
});

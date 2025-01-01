const { app, BrowserWindow, screen, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const request = require('request');
const xlsx = require('xlsx');

let mainWindow;

let api_code = '', api_name = 'School1', all_students = {}, all_teachers = {}, all_messages = {};
// const userDataPath = app.getPath('userData');
const userDataPath = __dirname;
const filesDir = path.join(userDataPath, 'files');

if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true });
}

const api_code_file = path.join(filesDir, 'api.json');
const students_file = path.join(filesDir, 'students.json');
const teachers_file = path.join(filesDir, 'teachers.json');
const messages_file = path.join(filesDir, 'messages.json');

try {
  // التعامل مع ملف API
  if (fs.existsSync(api_code_file)) {
    const apiData = JSON.parse(fs.readFileSync(api_code_file, 'utf-8'));

    // قراءة القيم المطلوبة
    api_code = apiData.api_code || '';
    api_name = apiData.api_name || '';
  } else {
    let apiData = {
      api_code: api_code,
      api_name: api_name
    };

    fs.writeFileSync(api_code_file, JSON.stringify(apiData, null, 2), 'utf-8');
    console.log('File created: ' + api_code_file);
  }

  // التعامل مع ملف الطلاب
  if (fs.existsSync(students_file)) {
    all_students = JSON.parse(fs.readFileSync(students_file, 'utf-8'));
  } else {
    fs.writeFileSync(students_file, JSON.stringify({}, null, 2), 'utf-8');
    console.log('File created: ' + students_file);
    all_students = {};
  }

  // التعامل مع ملف المعلمين
  if (fs.existsSync(teachers_file)) {
    all_teachers = JSON.parse(fs.readFileSync(teachers_file, 'utf-8'));
  } else {
    fs.writeFileSync(teachers_file, JSON.stringify({}, null, 2), 'utf-8');
    console.log('File created: ' + teachers_file);
    all_teachers = {};
  }

  // التعامل مع ملف الرسائل
  if (fs.existsSync(messages_file)) {
    all_messages = JSON.parse(fs.readFileSync(messages_file, 'utf-8'));
  } else {
    fs.writeFileSync(messages_file, JSON.stringify({}, null, 2), 'utf-8');
    console.log('File created: ' + messages_file);
    all_messages = {};
  }

} catch (error) {
  console.error('An error occurred:', error.message);
}

app.whenReady().then(() => {
  const displays = screen.getAllDisplays();
  const externalDisplay = displays.find((display) => display.bounds.x !== 0 || display.bounds.y !== 0);

  const display = externalDisplay || screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.floor(width * 0.8),
    height: Math.floor(height * 0.85),
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true
    },
    icon: path.join(__dirname, 'views/assets/images/favicon/web-app-manifest-512x512.png')
  });

  mainWindow.loadFile('views/index.html');
  // mainWindow.webContents.toggleDevTools();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

ipcMain.handle('get-total-balance', async () => {

  if (api_code === ''){
    return "يجب عليك ضبط الاعدادات";
  }

  const options = {
    method: 'POST',
    url: 'https://app.mobile.net.sa/api/v1/get-balance',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api_code}`
    }
  };

  // إنشاء طلب HTTP باستخدام مكتبة request
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) {
        console.error('Request Error:', error.message);
        resolve("يجب عليك ضبط الاعدادات"); // إرسال رسالة خطأ
        return;
      }

      // console.log('Status:', response.statusCode);
      // console.log('Headers:', JSON.stringify(response.headers));
      // console.log('Response:', body);

      // تحقق من حالة الرد
      if (response.statusCode !== 200) {
        console.error('HTTP Error:', response.statusCode, body);
        resolve("يجب عليك ضبط الاعدادات"); // معالجة الرد غير الصحيح
        return;
      }

      try {
        const parsedBody = JSON.parse(body); // تحويل النص إلى JSON
        if (parsedBody.status === "Success" && parsedBody.data && parsedBody.data.balance) {
          resolve(parsedBody.data.balance); // إرسال التوازن فقط
        } else {
          resolve("Balance not available"); // معالجة حالة الرد الغير متوقعة
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError.message);
        resolve("Error parsing response");
      }
    });
  });
});

ipcMain.handle('load-api-code', async () => {
  return { api_name, api_code };
});

ipcMain.handle('save-api-code', (event, _api_code, _api_name) => {
  api_code = _api_code;
  api_name = _api_name;

  const settingsDir = path.dirname(api_code_file);
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }

  let apiData = {
    api_code: api_code,
    api_name: api_name
  };

  // كتابة بيانات API إلى الملف
  try {
    fs.writeFileSync(api_code_file, JSON.stringify(apiData, null, 2));
    console.log('API Code saved successfully to', api_code_file);
  } catch (err) {
    console.error('Error saving API Code:', err);
    return { success: false, message: 'فشل في حفظ الاعدادات.' };
  }

  // التحقق من كود API باستخدام طلب HTTP
  const options = {
    method: 'POST',
    url: 'https://app.mobile.net.sa/api/v1/get-balance',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api_code}`
    }
  };

  return new Promise((resolve) => {
    request(options, (error, response, body) => {
      if (error || response.statusCode !== 200) {
        console.error('Invalid API Code:', error || body);
        resolve({ success: false, message: 'كود API غير صحيح!' });
      } else {
        console.log('API Code verified successfully.');
        resolve({ success: true, message: 'تم التحقق من كود API بنجاح!' });
      }
    });
  });
});

ipcMain.handle('load-all-students', async () => {
  all_students = JSON.parse(fs.readFileSync(students_file, 'utf-8'));
  return all_students;
});

ipcMain.handle('load-all-teachers', async () => {
  all_teachers = JSON.parse(fs.readFileSync(teachers_file, 'utf-8'));
  return all_teachers;
});

async function updatePendingMessages() {
  const pendingMessages = Object.entries(all_messages).filter(
    ([, message]) => message.messageStatus === 'pending'
  );

  if (pendingMessages.length === 0) {
    console.log('No pending messages found.');
    return;
  }

  // console.log(`Found ${pendingMessages.length} pending messages.`);

  for (const [timestamp, message] of pendingMessages) {
    try {
      await updateMessageStatus(message);
    } catch (error) {
      console.error(`Failed to update message ID ${message.messageId}:`, error);
    }
  }

  // حفظ التحديثات في ملف JSON
  fs.writeFileSync(messages_file, JSON.stringify(all_messages, null, 2), 'utf-8');
  console.log('All pending messages updated and saved to file.');
}

async function updateMessageStatus(message) {
  const url = `https://app.mobile.net.sa/api/v1/message-status/${message.messageId}`;
  console.log(`Updating status for message ID: ${message.messageId}`);

  return new Promise((resolve, reject) => {
    request(
      {
        method: 'POST',
        url: url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api_code}`,
        },
      },
      (error, response, body) => {
        if (error) {
          return reject(error);
        }

        try {
          const parsedBody = JSON.parse(body);

          // تحديث الحالة إذا تم الإرسال بنجاح
          if (response.statusCode === 200 && parsedBody.status) {
            message.messageStatus = parsedBody.status;
            console.log(`Message ${message.messageId} status updated to: ${parsedBody.status}`);
          } else {
            console.error(`Failed to update message ${message.messageId}:`, parsedBody.message);
          }

          resolve();
        } catch (parseError) {
          reject(parseError);
        }
      }
    );
  });
}

// معالجة الطلبات من واجهة المستخدم
ipcMain.handle('load-all-messages', async () => {
  try {
    all_messages = JSON.parse(fs.readFileSync(messages_file, 'utf-8'));
    await updatePendingMessages();
    console.log('Messages updated successfully.');
  } catch (error) {
    console.error('Error updating pending messages:', error);
  }
  return all_messages;
});

// Emport Excel
ipcMain.handle('import-excel-students', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'Excel Files', extensions: ['xls', 'xlsx'] }],
    properties: ['openFile']
  });

  if (canceled || filePaths.length === 0) {
    return { success: false, message: 'يجب اختيار ملف' };
  }

  const result = await dialog.showMessageBox({
    type: 'question',
    buttons: ['تأكيد', 'الغاء'],
    defaultId: 1,
    cancelId: 1,
    title: 'تأكيد الاستيراد',
    message: "تأكيد استيراد الملف، هذه العملية ستمسح جميع البيانات الموجودة!",
  });

  if (result.response === 0){
    try {
      const filePath = filePaths[0];
      const workbook = xlsx.readFile(filePath);
      const sheet = workbook.Sheets['Sheet2'];
      const data = xlsx.utils.sheet_to_json(sheet);

      let formattedData = {};
      let total_s = 0;
      data.forEach(row => {
        total_s += 1;
        // تحديث row["__EMPTY_4"] ليصبح كائناً يحتوي على القيم المنسقة
        if (row["__EMPTY_4"] && row["__EMPTY_4"] !== "" && row["__EMPTY_4"] !== "اسم الطالب") {
          formattedData[row["__EMPTY_5"]] = {
            "phone": row["__EMPTY_1"] || '',
            "class": row["__EMPTY_3"] ? row["__EMPTY_3"].toString().charAt(1) : '',
            "name": row["__EMPTY_4"] || '',
            "first_name": row["__EMPTY_4"] ? row["__EMPTY_4"].split(' ')[0] : '',
          };
        }
      });

      all_students = formattedData;
      fs.writeFileSync(students_file, JSON.stringify(formattedData, null, 2));
      await dialog.showMessageBox({
        type: 'info',
        buttons: ['حسنا'],
        title: 'نجاح',
        message: `تم بنجاح استيراد ${ total_s } طالب`,
      });
    } catch (error) {
      console.error('Error importing Excel file:', error.message);
      await dialog.showMessageBox({
        type: 'info',
        buttons: ['حسنا'],
        title: 'فشل',
        message: `فشل الاستيراد: ${ error.message}`,
      });
    }
  }
});

ipcMain.handle('import-excel-teachers', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'Excel Files', extensions: ['xls', 'xlsx'] }],
    properties: ['openFile']
  });

  if (canceled || filePaths.length === 0) {
    return { success: false, message: 'يجب اختيار ملف' };
  }

  const result = await dialog.showMessageBox({
    type: 'question',
    buttons: ['تأكيد', 'الغاء'],
    defaultId: 1,
    cancelId: 1,
    title: 'تأكيد الاستيراد',
    message: "تأكيد استيراد الملف، هذه العملية ستمسح جميع البيانات الموجودة!",
  });

  if (result.response === 0){
    try {
      const filePath = filePaths[0];
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // تحويل البيانات إلى صيغة JSON
      const data = xlsx.utils.sheet_to_json(worksheet);

      let formattedData = {};
      let total_t = 0;

      data.forEach(row => {
        if (row["__EMPTY_21"] && row["__EMPTY_21"] !== "" && row["__EMPTY_21"] !== "رقم الهوية" && row["__EMPTY_3"] && row["__EMPTY_3"] !== "" && row["__EMPTY_3"] !== "الجوال") {
          total_t += 1;

          formattedData[row["__EMPTY_21"]] = {
            "phone": row["__EMPTY_3"] || '',
            "name": row["__EMPTY_19"] || '',
            "first_name": row["__EMPTY_19"] ? row["__EMPTY_19"].split(' ')[0] : '',
          };

        }
      });

      all_teachers = formattedData;
      fs.writeFileSync(teachers_file, JSON.stringify(formattedData, null, 2));
      await dialog.showMessageBox({
        type: 'info',
        buttons: ['حسنا'],
        title: 'نجاح',
        message: `تم بنجاح استيراد ${ total_t } معلم`,
      });
    } catch (error) {
      console.error('Error importing Excel file:', error.message);
      await dialog.showMessageBox({
        type: 'info',
        buttons: ['حسنا'],
        title: 'فشل',
        message: `فشل الاستيراد: ${ error.message}`,
      });
    }
  }
});

ipcMain.handle('delete-teacher', async (event, index) => {
  delete all_teachers[index];

  fs.writeFileSync(teachers_file, JSON.stringify(all_teachers, null, 2))
  return { success: true };
});

ipcMain.handle('edit-teacher', async (event, index, updatedData) => {
  all_teachers[index] = updatedData; // تحديث بيانات الطالب
  fs.writeFileSync(teachers_file, JSON.stringify(all_teachers, null, 2));
  return { success: true };
});

ipcMain.handle('delete-student', async (event, index) => {
  delete all_students[index];

  fs.writeFileSync(students_file, JSON.stringify(all_students, null, 2))
  return { success: true };
});

ipcMain.handle('edit-student', async (event, index, updatedData) => {
  all_students[index] = updatedData; // تحديث بيانات الطالب
  fs.writeFileSync(students_file, JSON.stringify(all_students, null, 2));
  return { success: true };
});

async function sendMessage(_phones, _message, _bulks = false) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      number: _phones,
      senderName: api_name,
      sendAtOption: "Now",
      messageBody: _message
    });

    request({
      method: 'POST',
      url: 'https://app.mobile.net.sa/api/v1/send',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api_code}`
      },
      body: body
    }, function (error, response, body) {
      if (error) {
        console.error('Request error:', error);
        return reject('فشل في إرسال الرسالة بسبب خطأ في الطلب.');
      }

      if (response.statusCode !== 200) {
        console.error('Request failed with status:', response.statusCode);
        return reject(`فشل في إرسال الرسالة. رمز الحالة: ${response.statusCode}`);
      }

      try {
        const parsedBody = JSON.parse(body);

        const timestamp = new Date().toISOString();
        all_messages[timestamp] = {
          phones: _phones,
          message: _message,
          bulk: _bulks,
          hasSend: parsedBody.status,
          messageId: parsedBody.data.message.id,
          messageStatus: parsedBody.data.message.status
        };

        fs.writeFileSync(messages_file, JSON.stringify(all_messages, null, 2), 'utf-8');
        resolve(parsedBody.status === "Success" ? "Successfully sent" : parsedBody.message);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        reject('Failed to send message or invalid response format.');
      }
    });
  });
}

ipcMain.handle('send-message', async (event, content) => {
  try {
    console.log('Received send-message request:', content);

    if (!content.messageBody) {
      throw new Error('Message body is required');
    }

    const formatMessage = (template, data) => {
      return template.replace(/{{(\w+)}}/g, (match, key) => {
        return data[key] || match;
      });
    };

    switch (content.type) {
      case 'send-single': {
        const student = all_students[content.number];
        if (!student) throw new Error('Invalid student number');

        const message = formatMessage(content.messageBody, {
          name: student.name,
          first_name: student.first_name,
          phone: student.phone
        });

        try {
          await sendMessage(student.phone, message);
          return { success: true, title: "نجاح", message: `تم ارسال الرسالة بنجاح الى ${student.name}` };
        } catch (error) {
          return { success: false, title: "فشل", message: `فشل ارسال الرسالة بسبب: ${error}` };
        }
        break;
      }
      case 'send-teacher': {
        const teacher = all_teachers[content.number];
        if (!teacher) throw new Error('Invalid teacher number');

        const message = formatMessage(content.messageBody, {
          name: teacher.name,
          first_name: teacher.first_name,
          phone: teacher.phone
        });

        try {
          await sendMessage(teacher.phone, message);
          return { success: true, title: "نجاح", message: `تم ارسال الرسالة بنجاح الى ${teacher.name}` };
        } catch (error) {
          return { success: false, title: "فشل", message: `فشل ارسال الرسالة بسبب: ${error}` };
        }
        break;
      }
      case 'send-group': {
        let phones = [];
        let group = [];

        // تحديد المجموعة بناءً على content.number
        if (content.number === 'teachers') {
          group = Object.values(all_teachers); // جميع المعلمين
        } else if (!isNaN(content.number)) { // إذا كان رقمًا
          group = Object.values(all_students).filter(student => student.class === content.number); // الطلاب في الصف المحدد
        } else {
          throw new Error('Invalid group specified');
        }

        // استخراج أرقام الهواتف
        phones = group.map(person => person.phone);

        // إنشاء الرسائل المخصصة لكل شخص
        const messages = group.map(person =>
          formatMessage(content.messageBody, {
            name: person.name,
            first_name: person.first_name,
            phone: person.phone
          })
        );

        // التحقق من وجود أرقام الهواتف
        if (!phones.length) throw new Error('No phone numbers found for group');

        // إرسال رسائل جماعية باستخدام Promise.all
        try {
          const sendPromises = messages.map((message, index) =>
            sendMessage(phones[index], message, true)
          );

          // انتظار جميع الإرساليات
          const results = await Promise.all(sendPromises);
          return { success: true, title: "نجاح", message: `تم ارسال الرسالة بنجاح` };
        } catch (error) {
          return { success: false, title: "فشل", message: `فشل ارسال الرسالة بسبب: ${error}` };
        }
      }
      default:
        throw new Error(`Unknown type: ${content.type}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error processing send-message:', error.message);
    return { success: false, error: error.message };
  }
});

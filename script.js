// Survey State
let currentQuestion = 1;
const totalQuestions = 5;
const formData = {};

// DOM Elements
const form = document.getElementById('surveyForm');
const questions = document.querySelectorAll('.question');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const progressBar = document.getElementById('progressBar');
const currentStepSpan = document.getElementById('currentStep');
const totalStepsSpan = document.getElementById('totalSteps');
const thankYouDiv = document.getElementById('thankYou');
const surveyContainer = document.querySelector('.survey-container');

// Initialize
totalStepsSpan.textContent = totalQuestions;
updateProgress();

// Event Listeners
nextBtn.addEventListener('click', nextQuestion);
prevBtn.addEventListener('click', prevQuestion);
form.addEventListener('submit', handleSubmit);

// Add click handlers for radio buttons to auto-advance
document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        // Auto-advance for question 4 (radio buttons - Have you got Solar)
        const questionNum = parseInt(e.target.closest('.question').dataset.question);
        if (questionNum === 4) {
            setTimeout(() => {
                nextQuestion();
            }, 300);
        }
    });
});

// Add change handlers for select dropdowns to enable next button
document.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', () => {
        // Enable next button when a selection is made
        if (select.value) {
            nextBtn.disabled = false;
        }
    });
});

// Postcode validation - convert to uppercase and validate format
const postcodeInput = document.getElementById('postcode');
if (postcodeInput) {
    postcodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
    
    postcodeInput.addEventListener('blur', (e) => {
        const postcode = e.target.value.trim();
        const postcodeRegex = /^([A-Z]{1,2}\d{1,2}[A-Z]?)\s?(\d[A-Z]{2})$/;
        
        if (postcode && !postcodeRegex.test(postcode)) {
            e.target.setCustomValidity('Please enter a valid UK postcode (e.g., SW1A 1AA)');
            e.target.reportValidity();
        } else {
            e.target.setCustomValidity('');
        }
    });
}

function nextQuestion() {
    if (!validateCurrentQuestion()) {
        return;
    }
    
    saveCurrentQuestionData();
    
    if (currentQuestion < totalQuestions) {
        currentQuestion++;
        showQuestion(currentQuestion);
        updateProgress();
        updateButtons();
    }
}

function prevQuestion() {
    if (currentQuestion > 1) {
        currentQuestion--;
        showQuestion(currentQuestion);
        updateProgress();
        updateButtons();
    }
}

function showQuestion(questionNumber) {
    questions.forEach(question => {
        question.classList.remove('active');
    });
    
    const activeQuestion = document.querySelector(`[data-question="${questionNumber}"]`);
    if (activeQuestion) {
        activeQuestion.classList.add('active');
        // Scroll to top of survey container
        surveyContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function updateProgress() {
    const progress = (currentQuestion / totalQuestions) * 100;
    progressBar.style.width = progress + '%';
    currentStepSpan.textContent = currentQuestion;
}

function updateButtons() {
    // Show/hide previous button
    if (currentQuestion === 1) {
        prevBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'inline-block';
    }
    
    // Show/hide next and submit buttons
    if (currentQuestion === totalQuestions) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-block';
    } else {
        nextBtn.style.display = 'inline-block';
        submitBtn.style.display = 'none';
    }
}

function validateCurrentQuestion() {
    const activeQuestion = document.querySelector(`[data-question="${currentQuestion}"]`);
    
    if (currentQuestion <= 3) {
        // Select dropdown questions (Battery Brand, Size, Type)
        const selectInputs = activeQuestion.querySelectorAll('select');
        let isValid = true;
        
        selectInputs.forEach(select => {
            if (!select.value || select.value === '') {
                select.setCustomValidity('Please select an option.');
                select.reportValidity();
                isValid = false;
            } else {
                select.setCustomValidity('');
            }
        });
        
        return isValid;
    } else if (currentQuestion === 4) {
        // Radio button question (Have you got Solar)
        const radioInputs = activeQuestion.querySelectorAll('input[type="radio"]');
        const isChecked = Array.from(radioInputs).some(radio => radio.checked);
        
        if (!isChecked) {
            alert('Please select an option before continuing.');
            return false;
        }
    } else {
        // Form field questions (Question 5 - Contact Details)
        const inputs = activeQuestion.querySelectorAll('input, textarea, select');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.checkValidity()) {
                input.reportValidity();
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    return true;
}

function saveCurrentQuestionData() {
    const activeQuestion = document.querySelector(`[data-question="${currentQuestion}"]`);
    
    if (currentQuestion <= 3) {
        // Select dropdown questions
        const selectInputs = activeQuestion.querySelectorAll('select');
        selectInputs.forEach(select => {
            if (select.value) {
                formData[select.name] = select.value;
            }
        });
    } else if (currentQuestion === 4) {
        // Radio button question
        const radioInputs = activeQuestion.querySelectorAll('input[type="radio"]');
        radioInputs.forEach(radio => {
            if (radio.checked) {
                formData[radio.name] = radio.value;
            }
        });
    } else {
        // Form field questions
        const inputs = activeQuestion.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            formData[input.name] = input.value;
        });
    }
}

function handleSubmit(e) {
    e.preventDefault();
    
    if (!validateCurrentQuestion()) {
        return;
    }
    
    saveCurrentQuestionData();
    
    // Add timestamp
    formData.timestamp = new Date().toLocaleString('en-GB');
    
    // Submit to Google Sheets
    submitToGoogleSheets(formData);
}

// Initialize buttons state
updateButtons();

// Google Sheets Integration
// INSTRUCTIONS TO SET UP:
// 1. Go to https://script.google.com/
// 2. Create a new project
// 3. Copy the code from the comments below into the script editor
// 4. Deploy as a web app and copy the URL
// 5. Replace 'YOUR_GOOGLE_SCRIPT_URL_HERE' below with your deployment URL

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyvm2aE6fPsu5ZP5aOgczfcZVjIj75OqUgbf5MQDE1TRWXJqktg9hBg1F5M6TuqxUY/exec';

async function submitToGoogleSheets(data) {
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        // Show success message
        form.style.display = 'none';
        document.querySelector('.survey-header').style.display = 'none';
        thankYouDiv.style.display = 'block';
        
    } catch (error) {
        console.error('Error submitting to Google Sheets:', error);
        alert('There was an error submitting your information. Please try again or contact us directly at info@abacusenergysolutions.co.uk');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
    }
}

/*
GOOGLE APPS SCRIPT CODE:
Copy everything between the START and END markers below and paste into Google Apps Script

============ START GOOGLE APPS SCRIPT ============

// Force authorization by declaring required scopes
function forceAuthorization() {
  // This function requests all necessary permissions
  SpreadsheetApp.getActiveSpreadsheet();
  MailApp.getRemainingDailyQuota();
}

function doPost(e) {
  try {
    // Get the active spreadsheet (make sure you've created one and it's open)
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Parse the incoming data
    var data = JSON.parse(e.postData.contents);
    
    // If this is the first entry, create headers
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp',
        'Fuel Type',
        'Bedrooms',
        'Property Type',
        'Post Code',
        'Address',
        'Name',
        'Telephone',
        'Email'
      ]);
    }
    
    // Add the data as a new row
    sheet.appendRow([
      data.timestamp || new Date().toLocaleString(),
      data.fuelType || '',
      data.bedrooms || '',
      data.propertyType || '',
      data.postcode || '',
      data.address || '',
      data.name || '',
      data.telephone || '',
      data.email || ''
    ]);
    
    // Send automated email to customer
    if (data.email) {
      sendCustomerEmail(data);
    }
    
    // Send notification email to sales team
    sendSalesNotification(data);
    
    return ContentService.createTextOutput(JSON.stringify({
      'result': 'success'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      'result': 'error',
      'error': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function sendCustomerEmail(data) {
  // Log for debugging
  Logger.log('Attempting to send email to: ' + data.email);
  
  var customerEmail = data.email;
  var customerName = data.name || 'Valued Customer';
  
  // Validate email exists
  if (!customerEmail || customerEmail.trim() === '') {
    Logger.log('No email address provided');
    return;
  }
  
  var subject = 'Thank You for Your Battery Enquiry - Abacus Energy Solutions';
  
  var htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: #1a1a1a;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      letter-spacing: 1px;
    }
    .content {
      padding: 40px 30px;
      background-color: #ffffff;
    }
    .greeting {
      font-size: 18px;
      color: #333333;
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      color: #333333;
      margin-bottom: 15px;
    }
    .highlight-box {
      background: linear-gradient(135deg, #00a651 0%, #008a43 100%);
      color: #ffffff;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
      text-align: center;
    }
    .highlight-box strong {
      font-size: 18px;
      display: block;
      margin-bottom: 5px;
      color: #ffffff;
    }
    .highlight-box p {
      color: #ffffff;
      margin: 5px 0;
    }
    .details-box {
      background-color: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
      border-left: 4px solid #00a651;
    }
    .details-box h3 {
      color: #00a651;
      margin-top: 0;
      margin-bottom: 15px;
      font-size: 18px;
    }
    .detail-row {
      margin-bottom: 10px;
      font-size: 14px;
    }
    .detail-label {
      font-weight: bold;
      color: #333333;
    }
    .footer {
      background-color: #1a1a1a;
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
      font-size: 14px;
    }
    .contact-info {
      margin: 15px 0;
    }
    .contact-info a {
      color: #00a651;
      text-decoration: none;
    }
    .social-links {
      margin: 20px 0;
    }
    .social-links a {
      color: #00a651;
      text-decoration: none;
      margin: 0 10px;
    }
    .disclaimer {
      font-size: 12px;
      color: #999999;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>ABACUS ENERGY SOLUTIONS</h1>
    </div>
    
    <div class="content">
      <p class="greeting">Dear ${customerName},</p>
      
      <p class="message">
        Thank you for completing our battery survey! We've received your enquiry and are excited to help you expand your energy storage capacity with an additional GivEnergy Battery.
      </p>
      
      <div class="highlight-box">
        <strong>LIMITED TIME OFFER</strong>
        <p style="margin: 5px 0;">Get up to £1,000 off an additional GivEnergy Battery!</p>
      </div>
      
      <p class="message">
        <strong>What happens next?</strong><br>
        A member of our expert team will be in touch with you within the next 24 hours to discuss your enquiry in detail. We'll review your property information and provide you with a tailored solution that meets your needs.
      </p>
      
      <div class="details-box">
        <h3>Your Survey Details</h3>
        <div class="detail-row">
          <span class="detail-label">Battery Brand:</span> ${data.batteryBrand || 'Not provided'}
        </div>
        <div class="detail-row">
          <span class="detail-label">Battery Size:</span> ${data.batterySize || 'Not provided'}
        </div>
        <div class="detail-row">
          <span class="detail-label">Battery Type:</span> ${data.batteryType || 'Not provided'}
        </div>
        <div class="detail-row">
          <span class="detail-label">Has Solar:</span> ${data.hasSolar || 'Not provided'}
        </div>
        <div class="detail-row">
          <span class="detail-label">Post Code:</span> ${data.postcode || 'Not provided'}
        </div>
      </div>
      
      <p class="message">
        <strong>Why choose Abacus Energy Solutions?</strong>
      </p>
      <ul style="color: #333333; margin-left: 20px;">
        <li>Over 30 years of combined experience</li>
        <li>MCS accredited company</li>
        <li>Up to 12 years parts and labour warranty</li>
        <li>Thousands of happy customers</li>
        <li>All engineers are fully certified</li>
      </ul>
      
      <p class="message">
        If you have any immediate questions, please don't hesitate to contact us.
      </p>
      
      <p class="message">
        Best regards,<br>
        <strong>The Abacus Energy Solutions Team</strong>
      </p>
    </div>
    
    <div class="footer">
      <div class="contact-info">
        <strong>Contact Us</strong><br>
        Phone: <a href="tel:03301244299">03301 244 299</a><br>
        Email: <a href="mailto:info@abacusenergysolutions.co.uk">info@abacusenergysolutions.co.uk</a><br>
        Website: <a href="https://abacusenergysolutions.co.uk">abacusenergysolutions.co.uk</a>
      </div>
      
      <div class="contact-info">
        Unit 7 Olympic Way<br>
        Sefton Business Park<br>
        L30 1RD, UK
      </div>
      
      <div class="social-links">
        <a href="https://www.facebook.com/abacusenergysolutionsltd/">Facebook</a> |
        <a href="https://twitter.com/Abacus_E_S">Twitter</a> |
        <a href="https://www.instagram.com/abacusenergysolutions/">Instagram</a> |
        <a href="https://www.linkedin.com/company/74761631/">LinkedIn</a>
      </div>
      
      <div class="disclaimer">
        © 2025 Abacus Energy Solutions. All Rights Reserved.<br>
        This email was sent because you completed a battery survey on our website.
      </div>
    </div>
  </div>
</body>
</html>
  `;
  
  var plainBody = `
Dear ${customerName},

Thank you for completing our battery survey! We've received your enquiry and are excited to help you expand your energy storage capacity with an additional GivEnergy Battery.

LIMITED TIME OFFER: Get up to £1,000 off an additional GivEnergy Battery!

What happens next?
A member of our expert team will be in touch with you within the next 24 hours to discuss your enquiry in detail.

Your Survey Details:
- Battery Brand: ${data.batteryBrand || 'Not provided'}
- Battery Size: ${data.batterySize || 'Not provided'}
- Battery Type: ${data.batteryType || 'Not provided'}
- Has Solar: ${data.hasSolar || 'Not provided'}
- Post Code: ${data.postcode || 'Not provided'}

Why choose Abacus Energy Solutions?
- Over 30 years of combined experience
- MCS accredited company
- Up to 12 years parts and labour warranty
- Thousands of happy customers
- All engineers are fully certified

If you have any immediate questions, please contact us:
Phone: 03301 244 299
Email: info@abacusenergysolutions.co.uk
Website: https://abacusenergysolutions.co.uk

Best regards,
The Abacus Energy Solutions Team

Unit 7 Olympic Way, Sefton Business Park, L30 1RD, UK
  `;
  
  try {
    MailApp.sendEmail({
      to: customerEmail,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: 'Abacus Energy Solutions'
    });
    Logger.log('Email sent successfully to: ' + customerEmail);
  } catch (error) {
    Logger.log('Error sending email: ' + error.toString());
    // Re-throw error to see it in execution logs
    throw new Error('Email sending failed: ' + error.toString());
  }
}

// Send notification email to sales team
function sendSalesNotification(data) {
  Logger.log('Sending sales notification...');
  
  var subject = '🔥 New Heat Pump Lead - ' + (data.name || 'New Lead');
  
  var htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #00a651 0%, #008a43 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px;
    }
    .lead-info {
      background-color: #f5f5f5;
      border-left: 4px solid #00a651;
      padding: 20px;
      margin: 20px 0;
    }
    .info-row {
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    .info-row:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .label {
      font-weight: bold;
      color: #00a651;
      display: inline-block;
      width: 130px;
    }
    .value {
      color: #333333;
    }
    .cta {
      background-color: #00a651;
      color: #ffffff;
      padding: 15px 30px;
      text-align: center;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
      font-size: 16px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔥 New Heat Pump Lead</h1>
    </div>
    
    <div class="content">
      <p><strong>A new customer has completed the heat pump survey!</strong></p>
      
      <div class="cta">
        ACTION REQUIRED: Contact within 24 hours
      </div>
      
      <div class="lead-info">
        <h3 style="color: #00a651; margin-top: 0;">Contact Details</h3>
        <div class="info-row">
          <span class="label">Name:</span>
          <span class="value">${data.name || 'Not provided'}</span>
        </div>
        <div class="info-row">
          <span class="label">Email:</span>
          <span class="value"><a href="mailto:${data.email}">${data.email || 'Not provided'}</a></span>
        </div>
        <div class="info-row">
          <span class="label">Phone:</span>
          <span class="value"><a href="tel:${data.telephone}">${data.telephone || 'Not provided'}</a></span>
        </div>
        <div class="info-row">
          <span class="label">Post Code:</span>
          <span class="value">${data.postcode || 'Not provided'}</span>
        </div>
        <div class="info-row">
          <span class="label">Address:</span>
          <span class="value">${data.address || 'Not provided'}</span>
        </div>
      </div>
      
      <div class="lead-info">
        <h3 style="color: #00a651; margin-top: 0;">Property Details</h3>
        <div class="info-row">
          <span class="label">Current Fuel:</span>
          <span class="value">${data.fuelType || 'Not provided'}</span>
        </div>
        <div class="info-row">
          <span class="label">Bedrooms:</span>
          <span class="value">${data.bedrooms || 'Not provided'}</span>
        </div>
        <div class="info-row">
          <span class="label">Property Type:</span>
          <span class="value">${data.propertyType || 'Not provided'}</span>
        </div>
        <div class="info-row">
          <span class="label">Submitted:</span>
          <span class="value">${data.timestamp || new Date().toLocaleString()}</span>
        </div>
      </div>
      
      <p style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
        <strong>⏰ Reminder:</strong> Customer expects contact within 24 hours. This lead is eligible for the £500 off promotion (order before December 19th).
      </p>
    </div>
    
    <div class="footer">
      Sent from Heat Pump Survey Landing Page<br>
      heatpump.abacusenergysolutions.co.uk
    </div>
  </div>
</body>
</html>
  `;
  
  var plainBody = `
NEW HEAT PUMP LEAD

CONTACT DETAILS:
Name: ${data.name || 'Not provided'}
Email: ${data.email || 'Not provided'}
Phone: ${data.telephone || 'Not provided'}
Post Code: ${data.postcode || 'Not provided'}
Address: ${data.address || 'Not provided'}

PROPERTY DETAILS:
Current Fuel: ${data.fuelType || 'Not provided'}
Bedrooms: ${data.bedrooms || 'Not provided'}
Property Type: ${data.propertyType || 'Not provided'}
Submitted: ${data.timestamp || new Date().toLocaleString()}

ACTION REQUIRED: Contact within 24 hours
Eligible for £500 off promotion (order before December 19th)

---
Sent from Heat Pump Survey Landing Page
heatpump.abacusenergysolutions.co.uk
  `;
  
  try {
    MailApp.sendEmail({
      to: 'sales@abacusenergysolutions.co.uk',
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: 'Heat Pump Survey'
    });
    Logger.log('Sales notification sent successfully');
  } catch (error) {
    Logger.log('Error sending sales notification: ' + error.toString());
  }
}

// Test function - run this manually to trigger authorization
function testEmailFunction() {
  var testData = {
    email: 'test@example.com',
    name: 'Test User',
    fuelType: 'Natural Gas',
    bedrooms: 'Three bedrooms',
    propertyType: 'Detached / Semi / Terraced',
    postcode: 'L30 1RD',
    address: '123 Test Street',
    telephone: '07123456789',
    timestamp: new Date().toLocaleString()
  };
  
  Logger.log('Testing customer email function...');
  sendCustomerEmail(testData);
  Logger.log('Customer email sent');
  
  Logger.log('Testing sales notification...');
  sendSalesNotification(testData);
  Logger.log('Sales notification sent');
  
  Logger.log('Test complete - check both inboxes');
}

function doGet(e) {
  return doPost(e);
}

============ END GOOGLE APPS SCRIPT ============

SETUP INSTRUCTIONS:
1. Create a new Google Sheet for your survey responses
2. Go to Extensions > Apps Script
3. Delete any existing code and paste the code above
4. Click "Deploy" > "New deployment"
5. Choose "Web app" as the deployment type
6. Set "Execute as" to "Me"
7. Set "Who has access" to "Anyone"
8. Click "Deploy"
9. Copy the Web App URL
10. Paste it in the GOOGLE_SCRIPT_URL variable above (replace 'YOUR_GOOGLE_SCRIPT_URL_HERE')
11. Authorize the script when prompted
*/




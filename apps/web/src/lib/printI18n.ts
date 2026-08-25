export interface PrintLanguage {
  code: string
  label: string
  header: string
  patient: string
  doctor: string
  date: string
  age: string
  prescription: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
  advice: string
  footer: string
}

export const PRINT_LANGUAGES: PrintLanguage[] = [
  { code: 'en', label: 'English', header: 'Digital Prescription', patient: 'Patient', doctor: 'Doctor', date: 'Date', age: 'Age', prescription: 'Medication', dosage: 'Dosage', frequency: 'Frequency', duration: 'Duration', instructions: 'Instructions', advice: 'Advice', footer: 'Issued through Jioplix Clinical Workspace. Please follow your doctor’s instructions.' },
  { code: 'hi', label: 'हिन्दी', header: 'डिजिटल पर्ची', patient: 'मरीज़', doctor: 'चिकित्सक', date: 'तारीख़', age: 'आयु', prescription: 'दवा', dosage: 'मात्रा', frequency: 'आवृत्ति', duration: 'अवधि', instructions: 'निर्देश', advice: 'सलाह', footer: 'जियोप्लिक्स क्लिनिकल वर्कस्पेस के माध्यम से जारी किया गया। कृपया चिकित्सक के निर्देशों का पालन करें।' },
  { code: 'ta', label: 'தமிழ்', header: 'டிஜிட்டல் மருந்து சீட்டு', patient: 'நோயாளி', doctor: 'மருத்துவர்', date: 'தேதி', age: 'வயது', prescription: 'மருந்து', dosage: 'அளவு', frequency: 'அடிக்கடி', duration: 'காலம்', instructions: 'அறிவுரைகள்', advice: 'பரிந்துரை', footer: 'ஜியோப்ளிக்ஸ் கிளினிக்கல் வொர்க்ஸ்பேஸ் மூலம் வழங்கப்பட்டது. உங்கள் மருத்துவரின் அறிவுறுத்தல்களைப் பின்பற்றவும்.' },
  { code: 'te', label: 'తెలుగు', header: 'డిజిటల్ ప్రిస్క్రిప్షన్', patient: 'రోగి', doctor: 'వైద్యుడు', date: 'తేదీ', age: 'వయస్సు', prescription: 'మందు', dosage: 'మోతాదు', frequency: 'తరచుదనం', duration: 'కాలం', instructions: 'సూచనలు', advice: 'సలహా', footer: 'జియోప్లిక్స్ క్లినికల్ వర్క్‌స్పేస్ ద్వారా జారీ చేయబడింది. దయచేసి మీ వైద్యుడి సూచనలను పాటించండి.' },
  { code: 'kn', label: 'ಕನ್ನಡ', header: 'ಡಿಜಿಟಲ್ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್', patient: 'ರೋಗಿ', doctor: 'ವೈದ್ಯ', date: 'ದಿನಾಂಕ', age: 'ವಯಸ್ಸು', prescription: 'ಔಷಧಿ', dosage: 'ಡೋಸೇಜ್', frequency: 'ಆವರ್ತನೆ', duration: 'ಅವಧಿ', instructions: 'ಸೂಚನೆಗಳು', advice: 'ಸಲಹೆ', footer: 'ಜಿಯೋಪ್ಲಿಕ್ಸ್ ಕ್ಲಿನಿಕಲ್ ವರ್ಕ್‌ಸ್ಪೇಸ್ ಮೂಲಕ ನೀಡಲಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ವೈದ್ಯರ ಸೂಚನೆಗಳನ್ನು ಅನುಸರಿಸಿ.' },
  { code: 'mr', label: 'मराठी', header: 'डिजिटल प्रिस्क्रिप्शन', patient: 'रुग्ण', doctor: 'डॉक्टर', date: 'दिनांक', age: 'वय', prescription: 'औषध', dosage: 'डोस', frequency: 'वारंवारता', duration: 'कालावधी', instructions: 'सूचना', advice: 'सल्ला', footer: 'जियोप्लिक्स क्लिनिकल वर्कस्पेसद्वारे जारी. कृपया आपल्या डॉक्टरांच्या सूचनांचे पालन करा.' },
]

export function getPrintLanguage(code: string): PrintLanguage {
  return PRINT_LANGUAGES.find(l => l.code === code) ?? PRINT_LANGUAGES[0]
}

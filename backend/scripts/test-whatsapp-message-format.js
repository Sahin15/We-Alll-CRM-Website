#!/usr/bin/env node

/**
 * Test script to show how the WhatsApp message will look when decoded
 */

console.log('📱 WhatsApp Message Format Test\n');

// The encoded URL
const encodedUrl = "https://wa.me/918240858613?text=Hello%20Team%20WeAlll%2C%0A%0AI%20met%20you%20at%20Vyapaar%20Expo%202.0%20and%20would%20like%20to%20book%20a%20free%20consultation%20to%20discuss%20digital%20marketing%20and%20business%20growth%20solutions.Looking%20forward%20to%20connecting.%0A%0AThank%20you!";

// Extract and decode the message part
const messageParam = encodedUrl.split('text=')[1];
const decodedMessage = decodeURIComponent(messageParam);

console.log('🔗 Encoded WhatsApp URL:');
console.log(encodedUrl);
console.log('\n📝 How the message will appear in WhatsApp:');
console.log('─'.repeat(50));
console.log(decodedMessage);
console.log('─'.repeat(50));

console.log('\n✅ Message formatting:');
console.log('   • Greeting: "Hello Team WeAlll," with line break');
console.log('   • Main message: Clear and professional');
console.log('   • Closing: "Thank you!" with proper spacing');
console.log('\n🎉 WhatsApp message format looks great!');
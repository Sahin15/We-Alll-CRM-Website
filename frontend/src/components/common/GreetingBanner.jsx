import { Card } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import { FaSun, FaMoon, FaCloudSun, FaLightbulb, FaRocket, FaStar } from "react-icons/fa";
import { useState, useEffect } from "react";

const GreetingBanner = ({ subtitle = "Welcome to your dashboard" }) => {
  const { user } = useAuth();
  const [funMessage, setFunMessage] = useState(null);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good Morning", icon: <FaSun /> };
    if (hour < 18) return { text: "Good Afternoon", icon: <FaCloudSun /> };
    return { text: "Good Evening", icon: <FaMoon /> };
  };

  const getFormattedDate = () => {
    const options = { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    };
    return new Date().toLocaleDateString("en-US", options);
  };

  // Get contextual messages based on time
  const getContextualMessages = () => {
    const hour = new Date().getHours();
    const allMessages = [];
    
    // Morning Messages (5 AM - 11 AM)
    const morningMessages = [
      { type: 'morning', icon: <FaSun />, text: "Good morning! Coffee first, adulting second ☕" },
      { type: 'morning', icon: <FaSun />, text: "Rise and shine! Today's goal: Be awesome! ✨" },
      { type: 'morning', icon: <FaSun />, text: "New day, new opportunities! Let's crush it! 💪" },
      { type: 'morning', icon: <FaSun />, text: "Subah ho gayi mamu! Time to shine! 🌟" },
      { type: 'morning', icon: <FaSun />, text: "Morning vibes! Remember: You're capable of amazing things! 🚀" },
      { type: 'morning', icon: <FaSun />, text: "Wake up and be awesome! Today is your day! 🌅" },
      { type: 'morning', icon: <FaSun />, text: "Good morning sunshine! Let's make today count! ☀️" },
      { type: 'morning', icon: <FaSun />, text: "Fresh start, fresh mindset! You got this! 🎯" },
      { type: 'morning', icon: <FaSun />, text: "Nayi subah, nayi umeed! Let's go! 🌄" },
      { type: 'morning', icon: <FaSun />, text: "Morning motivation: Be the reason someone smiles today! 😊" },
      { type: 'morning', icon: <FaSun />, text: "Breakfast + Positivity = Perfect morning combo! 🥞" },
      { type: 'morning', icon: <FaSun />, text: "Early bird gets the worm! You're already winning! 🐦" },
      { type: 'morning', icon: <FaSun />, text: "Good morning! Make today so awesome, yesterday gets jealous! 💫" },
      { type: 'morning', icon: <FaSun />, text: "Chai ready? Mind ready? Let's do this! ☕" },
      { type: 'morning', icon: <FaSun />, text: "Morning mantra: I am capable, I am strong, I am ready! 💪" },
    ];
    
    // Lunch Time Messages (12 PM - 2 PM)
    const lunchMessages = [
      { type: 'lunch', icon: <FaRocket />, text: "Lunch time! Khana khao, khush raho! 🍽️" },
      { type: 'lunch', icon: <FaRocket />, text: "Time to refuel! Your stomach called, it wants biryani 🍛" },
      { type: 'lunch', icon: <FaRocket />, text: "Lunch break = Best break! Bon appétit! 😋" },
      { type: 'lunch', icon: <FaRocket />, text: "Bhook lagi hai? Time for some delicious food! 🍕" },
      { type: 'lunch', icon: <FaRocket />, text: "Lunch o'clock! Remember: A happy tummy = A happy mind! 🥗" },
      { type: 'lunch', icon: <FaRocket />, text: "Zomato moment! Order something yummy! 🍔" },
      { type: 'lunch', icon: <FaRocket />, text: "Lunch break! Because hangry is not a good look! 😅" },
      { type: 'lunch', icon: <FaRocket />, text: "Food time! Treat yourself, you deserve it! 🍜" },
      { type: 'lunch', icon: <FaRocket />, text: "Lunch calling! Dal chawal or pizza? Choose wisely! 🍕🍚" },
      { type: 'lunch', icon: <FaRocket />, text: "Khana time! Don't skip meals, your body needs fuel! 🥘" },
      { type: 'lunch', icon: <FaRocket />, text: "Lunch break vibes! Eat well, work better! 🍱" },
      { type: 'lunch', icon: <FaRocket />, text: "Swiggy or home food? Either way, enjoy! 🍲" },
      { type: 'lunch', icon: <FaRocket />, text: "Lunch hour! Time to feed the beast within! 🦁" },
      { type: 'lunch', icon: <FaRocket />, text: "Bhookh lagi badi zor se! Go grab that meal! 🍴" },
      { type: 'lunch', icon: <FaRocket />, text: "Lunch = Happiness on a plate! Dig in! 🍛" },
    ];
    
    // Tea Break Messages (4 PM - 5 PM)
    const teaMessages = [
      { type: 'tea', icon: <FaCloudSun />, text: "Chai time! ☕ Sip, relax, and recharge!" },
      { type: 'tea', icon: <FaCloudSun />, text: "Tea break! Because adulting is hard without chai! 🍵" },
      { type: 'tea', icon: <FaCloudSun />, text: "Chai pe charcha time! Grab your cup! ☕" },
      { type: 'tea', icon: <FaCloudSun />, text: "Afternoon slump? Chai to the rescue! 🫖" },
      { type: 'tea', icon: <FaCloudSun />, text: "Samosa + Chai = Perfect combo! 🥟☕" },
      { type: 'tea', icon: <FaCloudSun />, text: "Tea o'clock! Take a break, you've earned it! ☕" },
      { type: 'tea', icon: <FaCloudSun />, text: "Chai break! Life is better with tea! 🍵" },
      { type: 'tea', icon: <FaCloudSun />, text: "Pakode + Chai = Monsoon vibes! 🌧️☕" },
      { type: 'tea', icon: <FaCloudSun />, text: "Afternoon chai! Refresh your mind! 🫖" },
      { type: 'tea', icon: <FaCloudSun />, text: "Chai lover? This is your moment! ☕✨" },
      { type: 'tea', icon: <FaCloudSun />, text: "Tea time! Biscuit bhi le lena! 🍪☕" },
      { type: 'tea', icon: <FaCloudSun />, text: "Chai break = Mini vacation! Enjoy! 🏖️☕" },
      { type: 'tea', icon: <FaCloudSun />, text: "Garam chai, thandi hawa! Perfect! ☕🍃" },
      { type: 'tea', icon: <FaCloudSun />, text: "Tea time! Gossip optional, chai mandatory! 😄☕" },
      { type: 'tea', icon: <FaCloudSun />, text: "Chai is always a good idea! ☕💚" },
    ];
    
    // Evening/Logout Messages (6 PM - 8 PM)
    const eveningMessages = [
      { type: 'evening', icon: <FaMoon />, text: "Great work today! Time to unwind and relax! 🌙" },
      { type: 'evening', icon: <FaMoon />, text: "You did amazing today! Now go enjoy your evening! ✨" },
      { type: 'evening', icon: <FaMoon />, text: "Kaam khatam! Time to chill with family! 🏡" },
      { type: 'evening', icon: <FaMoon />, text: "Logout and log into life! You deserve it! 💫" },
      { type: 'evening', icon: <FaMoon />, text: "Another productive day! Pat yourself on the back! 👏" },
      { type: 'evening', icon: <FaMoon />, text: "Work done, fun begun! Have a wonderful evening! 🎉" },
      { type: 'evening', icon: <FaMoon />, text: "Time to clock out! You've earned your rest! 🌟" },
      { type: 'evening', icon: <FaMoon />, text: "Goodbye work, hello relaxation! See you tomorrow! 👋" },
      { type: 'evening', icon: <FaMoon />, text: "Shaam ho gayi! Time for chai and chill! ☕🌆" },
      { type: 'evening', icon: <FaMoon />, text: "You crushed it today! Now go recharge! 🔋" },
      { type: 'evening', icon: <FaMoon />, text: "Evening vibes! Spend time with loved ones! ❤️" },
      { type: 'evening', icon: <FaMoon />, text: "Work-life balance achieved! Enjoy your evening! ⚖️" },
      { type: 'evening', icon: <FaMoon />, text: "Logout time! Your couch is calling! 🛋️" },
      { type: 'evening', icon: <FaMoon />, text: "Another day, another victory! Rest well! 🏆" },
      { type: 'evening', icon: <FaMoon />, text: "Time to switch off work mode! You did great! 💪" },
    ];
    
    // Motivational Quotes
    const quotes = [
      { type: 'quote', icon: <FaStar />, text: "Success is not final, failure is not fatal: it is the courage to continue that counts." },
      { type: 'quote', icon: <FaRocket />, text: "The only way to do great work is to love what you do." },
      { type: 'quote', icon: <FaStar />, text: "Believe you can and you're halfway there." },
      { type: 'quote', icon: <FaStar />, text: "Dream big, work hard, stay focused!" },
      { type: 'quote', icon: <FaRocket />, text: "Your limitation—it's only your imagination." },
      { type: 'quote', icon: <FaStar />, text: "Great things never come from comfort zones." },
      { type: 'quote', icon: <FaRocket />, text: "Don't stop when you're tired. Stop when you're done." },
      { type: 'quote', icon: <FaStar />, text: "The future depends on what you do today." },
      { type: 'quote', icon: <FaRocket />, text: "Success doesn't just find you. You have to go out and get it." },
      { type: 'quote', icon: <FaStar />, text: "The harder you work for something, the greater you'll feel when you achieve it." },
      { type: 'quote', icon: <FaRocket />, text: "Don't watch the clock; do what it does. Keep going." },
      { type: 'quote', icon: <FaStar />, text: "Opportunities don't happen. You create them." },
      { type: 'quote', icon: <FaRocket />, text: "It's not whether you get knocked down, it's whether you get up." },
      { type: 'quote', icon: <FaStar />, text: "The secret of getting ahead is getting started." },
      { type: 'quote', icon: <FaRocket />, text: "Don't be afraid to give up the good to go for the great." },
    ];
    
    // Fun Facts
    const facts = [
      { type: 'fact', icon: <FaLightbulb />, text: "Did you know? Taking short breaks every hour can boost productivity by 13%!" },
      { type: 'fact', icon: <FaLightbulb />, text: "Fun fact: Smiling can actually make you feel happier, even if you fake it!" },
      { type: 'fact', icon: <FaLightbulb />, text: "Studies show that a tidy workspace can increase focus by up to 20%!" },
      { type: 'fact', icon: <FaLightbulb />, text: "Coffee fact: The world consumes about 2.25 billion cups of coffee every day!" },
      { type: 'fact', icon: <FaLightbulb />, text: "Did you know? Laughing for 15 minutes burns up to 40 calories!" },
      { type: 'fact', icon: <FaLightbulb />, text: "Fun fact: Your brain uses 20% of your body's energy!" },
      { type: 'fact', icon: <FaLightbulb />, text: "Did you know? Walking meetings can boost creativity by 60%!" },
      { type: 'fact', icon: <FaLightbulb />, text: "Fun fact: Listening to music can improve your work performance!" },
      { type: 'fact', icon: <FaLightbulb />, text: "Did you know? Plants in the office can increase productivity by 15%!" },
      { type: 'fact', icon: <FaLightbulb />, text: "Fun fact: The average person spends 90,000 hours at work in their lifetime!" },
      { type: 'fact', icon: <FaLightbulb />, text: "Did you know? Standing desks can reduce back pain by 32%!" },
      { type: 'fact', icon: <FaLightbulb />, text: "Fun fact: Drinking water can improve concentration and memory!" },
      { type: 'fact', icon: <FaLightbulb />, text: "Did you know? A power nap of 20 minutes can boost alertness!" },
      { type: 'fact', icon: <FaLightbulb />, text: "Fun fact: Blue light from screens can affect your sleep cycle!" },
      { type: 'fact', icon: <FaLightbulb />, text: "Did you know? Gratitude journaling can improve mental health!" },
    ];
    
    // Encouraging Messages
    const encouragement = [
      { type: 'message', icon: <FaRocket />, text: "You're doing amazing! Keep pushing forward!" },
      { type: 'message', icon: <FaStar />, text: "Every expert was once a beginner. Keep learning!" },
      { type: 'message', icon: <FaRocket />, text: "Your hard work is paying off. Stay consistent!" },
      { type: 'message', icon: <FaRocket />, text: "Today is a great day to accomplish something amazing!" },
      { type: 'message', icon: <FaStar />, text: "You're stronger than you think! Keep going! 💪" },
      { type: 'message', icon: <FaRocket />, text: "Small progress is still progress! Keep it up! 🎯" },
      { type: 'message', icon: <FaStar />, text: "Believe in yourself! You've got this! 🌟" },
      { type: 'message', icon: <FaRocket />, text: "Your potential is endless! Keep shining! ✨" },
      { type: 'message', icon: <FaStar />, text: "Every day is a fresh start! Make it count! 🌅" },
      { type: 'message', icon: <FaRocket />, text: "You're making a difference! Keep it up! 🎯" },
      { type: 'message', icon: <FaStar />, text: "Stay positive, work hard, make it happen! 💫" },
      { type: 'message', icon: <FaRocket />, text: "Your dedication is inspiring! Keep going! 🚀" },
      { type: 'message', icon: <FaStar />, text: "Challenges make you stronger! Embrace them! 💪" },
      { type: 'message', icon: <FaRocket />, text: "You're on the right path! Trust the process! 🛤️" },
      { type: 'message', icon: <FaStar />, text: "Keep your head up! Better days are coming! 🌈" },
    ];
    
    // Office Jokes
    const jokes = [
      { type: 'joke', icon: <FaStar />, text: "Why do programmers prefer dark mode? Because light attracts bugs! 🐛" },
      { type: 'joke', icon: <FaRocket />, text: "I told my computer I needed a break... now it won't stop sending me Kit-Kat ads! 🍫" },
      { type: 'joke', icon: <FaStar />, text: "Why did the developer go broke? Because he used up all his cache! 💰" },
      { type: 'joke', icon: <FaRocket />, text: "My code doesn't always work, but when it does, I don't know why! 😅" },
      { type: 'joke', icon: <FaStar />, text: "There are 10 types of people: Those who understand binary and those who don't! 😄" },
      { type: 'joke', icon: <FaRocket />, text: "I'm not lazy, I'm just on energy-saving mode! 🔋" },
      { type: 'joke', icon: <FaStar />, text: "Why do Java developers wear glasses? Because they can't C#! 👓" },
      { type: 'joke', icon: <FaRocket />, text: "I would tell you a UDP joke, but you might not get it! 📡" },
      { type: 'joke', icon: <FaStar />, text: "How many programmers does it take to change a light bulb? None, it's a hardware problem! 💡" },
      { type: 'joke', icon: <FaRocket />, text: "I'm not procrastinating, I'm doing side quests! 🎮" },
      { type: 'joke', icon: <FaStar />, text: "My code is like my coffee: dark, bitter, and keeps me up at night! ☕" },
      { type: 'joke', icon: <FaRocket />, text: "404: Motivation not found! Just kidding, you got this! 😄" },
      { type: 'joke', icon: <FaStar />, text: "I speak fluent sarcasm and broken code! 💻" },
      { type: 'joke', icon: <FaRocket />, text: "Ctrl+Z is my favorite life hack! ⌨️" },
      { type: 'joke', icon: <FaStar />, text: "I'm not arguing, I'm just explaining why I'm right! 😏" },
    ];
    
    // Hindi Messages (Zomato Style)
    const hindiMessages = [
      { type: 'hindi', icon: <FaStar />, text: "Aaj ka din mast jayega! Bas positive vibes! ✨" },
      { type: 'hindi', icon: <FaRocket />, text: "Mehnat kar, safalta zaroor milegi! 🎯" },
      { type: 'hindi', icon: <FaStar />, text: "Tension nahi lene ka! Sab theek ho jayega! 😊" },
      { type: 'hindi', icon: <FaRocket />, text: "Apna time aayega! Keep hustling! 💪" },
      { type: 'hindi', icon: <FaStar />, text: "Zindagi mein masti zaroori hai! Enjoy karo! 🎉" },
      { type: 'hindi', icon: <FaRocket />, text: "Kaam bhi, masti bhi! Balance is key! ⚖️" },
      { type: 'hindi', icon: <FaStar />, text: "Himmat rakho, sab kuch ho jayega! 💫" },
      { type: 'hindi', icon: <FaRocket />, text: "Aaj bhi, kal bhi, hamesha rockstar! 🎸" },
      { type: 'hindi', icon: <FaStar />, text: "Khush raho, mast raho! Life is beautiful! 🌺" },
      { type: 'hindi', icon: <FaRocket />, text: "Kaam karo, naam kamao! You're a star! ⭐" },
      { type: 'hindi', icon: <FaStar />, text: "Dil se karo, dil ko lagao! Work with passion! ❤️" },
      { type: 'hindi', icon: <FaRocket />, text: "Thoda break, thoda kaam! Perfect balance! ⚖️" },
      { type: 'hindi', icon: <FaStar />, text: "Muskurao, duniya haseen hai! Smile more! 😊" },
      { type: 'hindi', icon: <FaRocket />, text: "Aaj ki mehnat, kal ki safalta! Keep going! 🚀" },
      { type: 'hindi', icon: <FaStar />, text: "Zindagi ek safar hai suhana! Enjoy the journey! 🛤️" },
    ];
    
    // Add contextual messages based on time
    if (hour >= 5 && hour < 12) {
      allMessages.push(...morningMessages);
    } else if (hour >= 12 && hour < 14) {
      allMessages.push(...lunchMessages);
    } else if (hour >= 16 && hour < 17) {
      allMessages.push(...teaMessages);
    } else if (hour >= 18 && hour < 21) {
      allMessages.push(...eveningMessages);
    }
    
    // Always add these to the pool
    allMessages.push(...quotes, ...facts, ...encouragement, ...jokes, ...hindiMessages);
    
    return allMessages;
  };
  
  const funContent = getContextualMessages();

  useEffect(() => {
    // Select a random fun message
    const randomIndex = Math.floor(Math.random() * funContent.length);
    setFunMessage(funContent[randomIndex]);
  }, []);

  const greeting = getGreeting();

  return (
    <Card className="greeting-banner shadow-lg mb-4">
      <Card.Body className="text-white position-relative">
        <div className="greeting-content">
          <div className="d-flex align-items-center mb-2">
            <span className="greeting-icon me-3">{greeting.icon}</span>
            <h2 className="mb-0 greeting-text">
              {greeting.text}! 👋
            </h2>
          </div>
          <p className="mb-1 greeting-subtitle">
            {subtitle}, <strong className="user-name">{user?.name || "User"}</strong>
          </p>
          <small className="opacity-75 d-flex align-items-center">
            <span className="date-badge">{getFormattedDate()}</span>
          </small>
          
          {/* Fun Message Section */}
          {funMessage && (
            <div className="fun-message-box mt-2">
              <div className="d-flex align-items-center justify-content-center">
                <span className="fun-icon me-2">{funMessage.icon}</span>
                <div className="fun-message-text">
                  {funMessage.text}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Animated background elements */}
        <div className="greeting-bg-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </Card.Body>
      
      <style>{`
        .greeting-banner {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
        }
        
        .greeting-banner .card-body {
          padding: 1.25rem !important;
        }
        
        .greeting-banner::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, 
            rgba(255,255,255,0.3) 0%, 
            rgba(255,255,255,0.8) 50%, 
            rgba(255,255,255,0.3) 100%);
          animation: shimmer 3s ease-in-out infinite;
        }
        
        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        .greeting-content {
          position: relative;
          z-index: 2;
        }
        
        .greeting-icon {
          font-size: 2rem;
          animation: float 3s ease-in-out infinite;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .greeting-text {
          font-weight: 700;
          font-size: 1.75rem;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
          animation: fadeInUp 0.6s ease-out;
        }
        
        .greeting-subtitle {
          font-size: 1rem;
          animation: fadeInUp 0.8s ease-out;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }
        
        .user-name {
          background: rgba(255,255,255,0.2);
          padding: 2px 12px;
          border-radius: 20px;
          display: inline-block;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.3);
          transition: all 0.3s ease;
        }
        
        .user-name:hover {
          background: rgba(255,255,255,0.3);
          transform: scale(1.05);
        }
        
        .date-badge {
          background: rgba(255,255,255,0.15);
          padding: 4px 12px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
          font-size: 0.9rem;
        }
        
        /* Fun Message Box - Ultra Premium Design */
        .fun-message-box {
          background: linear-gradient(135deg, 
            rgba(255,255,255,0.3) 0%, 
            rgba(255,255,255,0.18) 50%,
            rgba(255,255,255,0.25) 100%
          );
          backdrop-filter: blur(20px) saturate(180%);
          border: 2px solid rgba(255,255,255,0.5);
          border-radius: 14px;
          padding: 14px 18px;
          animation: slideInBounce 0.8s ease-out, floatBox 6s ease-in-out infinite;
          box-shadow: 
            0 10px 30px rgba(0,0,0,0.2),
            0 4px 12px rgba(0,0,0,0.1),
            inset 0 2px 0 rgba(255,255,255,0.4),
            inset 0 -2px 0 rgba(0,0,0,0.1);
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .fun-message-box:hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 
            0 15px 40px rgba(0,0,0,0.25),
            0 6px 16px rgba(0,0,0,0.15),
            inset 0 2px 0 rgba(255,255,255,0.5),
            inset 0 -2px 0 rgba(0,0,0,0.1);
          border-color: rgba(255,255,255,0.6);
        }
        
        /* Animated gradient background */
        .fun-message-box::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(
            circle at center,
            rgba(255,255,255,0.15) 0%,
            transparent 50%
          );
          animation: rotateGradient 8s linear infinite;
          z-index: 0;
        }
        
        /* Shine effect */
        .fun-message-box::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, 
            transparent, 
            rgba(255,255,255,0.4), 
            transparent
          );
          animation: shine 4s ease-in-out infinite;
          z-index: 1;
        }
        
        @keyframes rotateGradient {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes floatBox {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        
        @keyframes shine {
          0% { left: -100%; }
          20% { left: 100%; }
          100% { left: 100%; }
        }
        
        @keyframes slideInBounce {
          0% {
            opacity: 0;
            transform: translateX(40px) scale(0.9) rotateY(10deg);
          }
          50% {
            opacity: 0.8;
            transform: translateX(-5px) scale(1.02) rotateY(-2deg);
          }
          70% {
            opacity: 1;
            transform: translateX(2px) scale(0.99) rotateY(1deg);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1) rotateY(0deg);
          }
        }
        
        .fun-icon {
          font-size: 1.6rem;
          color: #ffd700;
          filter: drop-shadow(0 4px 8px rgba(255,215,0,0.5));
          animation: iconPulseGlow 2.5s ease-in-out infinite;
          position: relative;
          z-index: 2;
        }
        
        @keyframes iconPulseGlow {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            filter: drop-shadow(0 4px 8px rgba(255,215,0,0.5));
          }
          25% {
            transform: scale(1.15) rotate(-5deg);
            filter: drop-shadow(0 6px 12px rgba(255,215,0,0.7));
          }
          50% {
            transform: scale(1.1) rotate(0deg);
            filter: drop-shadow(0 8px 16px rgba(255,215,0,0.8));
          }
          75% {
            transform: scale(1.15) rotate(5deg);
            filter: drop-shadow(0 6px 12px rgba(255,215,0,0.7));
          }
        }
        
        .fun-message-text {
          color: #ffffff;
          font-size: 1.05rem;
          line-height: 1.6;
          font-style: italic;
          font-weight: 700;
          position: relative;
          z-index: 2;
          letter-spacing: 0.5px;
          text-align: center;
          background: linear-gradient(135deg, 
            #ffffff 0%, 
            #f0f0f0 50%, 
            #ffffff 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.6))
                  drop-shadow(0 0 12px rgba(255,255,255,0.3))
                  drop-shadow(0 0 20px rgba(255,255,255,0.2));
          animation: textShine 4s ease-in-out infinite, textFloat 3s ease-in-out infinite;
          text-transform: none;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }
        
        @keyframes textShine {
          0%, 100% {
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.6))
                    drop-shadow(0 0 12px rgba(255,255,255,0.3))
                    drop-shadow(0 0 20px rgba(255,255,255,0.2));
          }
          50% {
            filter: drop-shadow(2px 2px 6px rgba(0,0,0,0.7))
                    drop-shadow(0 0 18px rgba(255,255,255,0.4))
                    drop-shadow(0 0 30px rgba(255,255,255,0.3));
          }
        }
        
        @keyframes textFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .greeting-bg-shapes {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          z-index: 1;
        }
        
        .shape {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          animation: float-shapes 20s ease-in-out infinite;
        }
        
        .shape-1 {
          width: 150px;
          height: 150px;
          top: -50px;
          right: 10%;
          animation-delay: 0s;
        }
        
        .shape-2 {
          width: 100px;
          height: 100px;
          bottom: -30px;
          left: 15%;
          animation-delay: 2s;
        }
        
        .shape-3 {
          width: 80px;
          height: 80px;
          top: 50%;
          right: 5%;
          animation-delay: 4s;
        }
        
        @keyframes float-shapes {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.6;
          }
        }
        
        /* Mobile Responsive Styles */
        @media (max-width: 575.98px) {
          .greeting-banner {
            border-radius: 12px;
            margin-top: 0;
          }
          
          .greeting-icon {
            font-size: 1.75rem !important;
          }
          
          .greeting-text {
            font-size: 1.5rem !important;
          }
          
          .greeting-subtitle {
            font-size: 0.95rem !important;
          }
          
          .user-name {
            padding: 2px 8px;
            font-size: 0.95rem;
          }
          
          .date-badge {
            font-size: 0.75rem !important;
            padding: 3px 10px;
          }
          
          /* Hide or reduce background shapes on mobile */
          .shape-1 {
            width: 100px;
            height: 100px;
          }
          
          .shape-2 {
            width: 70px;
            height: 70px;
          }
          
          .shape-3 {
            display: none;
          }
          
          /* Fun message mobile */
          .fun-message-box {
            padding: 10px 12px;
            margin-top: 10px !important;
            border-radius: 10px;
          }
          
          .fun-icon {
            font-size: 1.2rem;
          }
          
          .fun-message-text {
            font-size: 0.85rem;
            line-height: 1.4;
          }
        }
        
        /* Tablet adjustments */
        @media (min-width: 576px) and (max-width: 767.98px) {
          .greeting-icon {
            font-size: 2rem;
          }
          
          .greeting-text {
            font-size: 1.75rem;
          }
        }
      `}</style>
    </Card>
  );
};

export default GreetingBanner;

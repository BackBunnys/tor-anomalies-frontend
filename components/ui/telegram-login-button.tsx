import React from "react";
import { useEffect } from "react";

export default function TelegramLoginButton({botName, onAuth}: any) {
    useEffect(() => {
        (window as any).onTelegramAuth = (user: any) => {
            console.log(user);
        }
        return () => {
            (window as any).onTelegramAuth = undefined;
        }
    });

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-login', botName);
        script.setAttribute('data-size', 'middle');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');
        document.getElementById('telegram-login-container')?.appendChild(script);
    
        return () => {
            document.getElementById('telegram-login-container')?.appendChild(script);
        };
      }, [botName]);

    
      return <div id="telegram-login-container"></div>;
}
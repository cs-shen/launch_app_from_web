/**
 * Smart App Opener
 * 智慧型 App 開啟器 - 自動偵測並開啟 App 或導向商店
 */

class AppOpener {
    constructor(config) {
        this.config = {
            // Universal Links / App Links - 測試版本使用固定 URL
            universalLink: config.universalLink || 'https://demo.cyberbiz.co/zh-TW/blogs/%E8%89%AF%E5%93%81%E7%94%9F%E6%B4%BB%E7%A0%94%E7%A9%B6%E6%89%80',
            
            // Custom URL Schemes
            iosScheme: config.iosScheme || 'cyb://',
            
            // App Store URLs
            appStoreUrl: config.appStoreUrl || 'https://apps.apple.com/app/id1491696181',
            playStoreUrl: config.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.funbox.omoapp',
            
            // Android Package Name
            androidPackage: config.androidPackage || 'co.cyberbiz.demo',
            
            // Timeout 設定（毫秒）
            timeout: config.timeout || 2000,
            
            // 按鈕狀態恢復延遲（毫秒）
            buttonResetDelay: config.buttonResetDelay || 200,
            
            // 按鈕點擊延遲（毫秒）
            buttonClickDelay: config.buttonClickDelay || 100,
            
            // 自動開啟延遲（毫秒）
            autoOpenDelay: config.autoOpenDelay || 500
        };
        
        this.platform = this.detectPlatform();
        this.isOpening = false; // 防重複點擊標記
    }
    
    detectPlatform() {
        const ua = navigator.userAgent.toLowerCase();
        
        if (/iphone|ipad|ipod/.test(ua)) {
            return 'ios';
        } else if (/android/.test(ua)) {
            return 'android';
        } else if (/macintosh/.test(ua) && 'ontouchend' in document) {
            // iPad with desktop mode
            return 'ios';
        }
        
        return 'unknown';
    }
    
    isMobile() {
        // 檢查是否為行動裝置
        const ua = navigator.userAgent.toLowerCase();
        const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 768;
        
        return isMobileUA || (isTouchDevice && isSmallScreen);
    }
    
    isNativeSafari() {
        if (this.platform !== 'ios') return false;
        
        const userAgent = navigator.userAgent;
        return /Safari/.test(userAgent) && 
               !/Chrome|CriOS|FxiOS|EdgiOS|Line|FBAV|Instagram|Twitter|WeChat|Messenger|TikTok|LinkedIn|Pinterest|Snapchat|WhatsApp|Telegram|Viber|Skype/.test(userAgent) &&
               !window.navigator.standalone; // 排除 PWA
    }
    
    open() {
        // 防重複點擊
        if (this.isOpening) {
            console.log('App is already opening, ignoring duplicate request');
            return;
        }
        
        this.isOpening = true;
        
        // 設定重置標記的 timeout
        setTimeout(() => {
            this.isOpening = false;
        }, this.config.timeout + 500);
        
        switch (this.platform) {
            case 'ios':
                this.openIOS();
                break;
            case 'android':
                this.openAndroid();
                break;
            default:
                this.isOpening = false; // 立即重置，因為會顯示錯誤
                this.showPlatformNotSupported();
        }
    }
    
    openIOS() {
        // 精確判斷是否為原生 Safari（支援 Smart App Banner）
        const isNativeSafari = this.isNativeSafari();
        
        if (isNativeSafari) {
            // 原生 Safari: 嘗試 Universal Link
            window.location.href = this.config.universalLink;
            
            // 重置 isOpening 標記，允許用戶重新嘗試
            setTimeout(() => {
                this.isOpening = false;
            }, 1000);
        } else {
            // 其他情況: 使用 custom scheme + timeout
            let hasBlurred = false;
            let timeoutId = null;
            
            const onBlur = () => { hasBlurred = true; };
            const onVisibilityChange = () => {
                if (document.hidden) hasBlurred = true;
            };
            
            // 清理函數
            const cleanup = () => {
                window.removeEventListener('blur', onBlur);
                document.removeEventListener('visibilitychange', onVisibilityChange);
                if (timeoutId) clearTimeout(timeoutId);
            };
            
            // 監聽事件
            window.addEventListener('blur', onBlur);
            document.addEventListener('visibilitychange', onVisibilityChange);
            
            // 嘗試開啟 App - 直接使用 URL，不做額外編碼處理
            const dynamicScheme = `${this.config.iosScheme}${this.config.universalLink}`;
            window.location.href = dynamicScheme;
            
            // 設定 timeout
            timeoutId = setTimeout(() => {
                cleanup();
                if (!hasBlurred) {
                    // App 沒開啟，去 App Store
                    window.location.href = this.config.appStoreUrl;
                }
            }, this.config.timeout);
            
            // 頁面卸載時清理（使用箭頭函數避免重複綁定）
            const handleBeforeUnload = () => {
                cleanup();
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
        }
    }
    
    openAndroid() {
        // 使用 Intent URL 方式，包含 fallback 到 Play Store - 使用動態 URL
        const dynamicDomain = this.config.universalLink.replace('https://', '').replace('http://', '');
        const intentUrl = `intent://${dynamicDomain}#Intent;scheme=https;package=${this.config.androidPackage};S.browser_fallback_url=${encodeURIComponent(this.config.playStoreUrl)};end`;
        
        let hasBlurred = false;
        let timeoutId = null;
        
        const onBlur = () => { hasBlurred = true; };
        const onVisibilityChange = () => {
            if (document.hidden) hasBlurred = true;
        };
        
        // 清理函數
        const cleanup = () => {
            window.removeEventListener('blur', onBlur);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            if (timeoutId) clearTimeout(timeoutId);
        };
        
        // 監聽事件
        window.addEventListener('blur', onBlur);
        document.addEventListener('visibilitychange', onVisibilityChange);
        
        try {
            window.location.href = intentUrl;
            
            // 設定 timeout，如果 App 沒開啟就導向 Play Store
            timeoutId = setTimeout(() => {
                cleanup();
                if (!hasBlurred) {
                    console.log('App not opened, redirecting to Play Store');
                    window.location.href = this.config.playStoreUrl;
                }
            }, this.config.timeout);
            
        } catch (e) {
            cleanup();
            // 如果 Intent URL 失敗，直接導向 Play Store
            console.log('Intent URL failed, redirecting to Play Store');
            window.location.href = this.config.playStoreUrl;
        }
        
        // 頁面卸載時清理（使用箭頭函數避免重複綁定）
        const handleBeforeUnload = () => {
            cleanup();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
    }
    

    
    showPlatformNotSupported() {
        // 使用更友善的提示方式，而不是 alert
        console.warn('Platform not supported:', navigator.userAgent);
        
        // 可以考慮顯示一個更友善的 UI 提示
        const banner = document.getElementById('appBanner');
        if (banner) {
            banner.innerHTML = `
                <div style="color: white; text-align: center; padding: 10px;">
                    <span>此功能需要在手機上使用</span>
                </div>
            `;
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 動態設定 Smart App Banner 的 URL - 測試版本使用固定 URL
    const smartAppBannerMeta = document.querySelector('meta[name="apple-itunes-app"]');
    if (smartAppBannerMeta) {
        const testUrl = 'https://demo.cyberbiz.co/zh-TW/blogs/%E8%89%AF%E5%93%81%E7%94%9F%E6%B4%BB%E7%A0%94%E7%A9%B6%E6%89%80';
        const appId = '1491696181'; // 你的 App ID
        smartAppBannerMeta.setAttribute('content', `app-id=${appId}, app-argument=${testUrl}`);
    }
    
    // 直接使用預設值，已經在 constructor 中設定好了
    const appOpener = new AppOpener({});
    
    // 檢查是否為行動裝置
    if (!appOpener.isMobile()) {
        // 桌面版：隱藏 App 開啟器，顯示桌面提示
        const appBanner = document.getElementById('appBanner');
        const body = document.body;
        
        appBanner.classList.add('hidden');
        body.classList.remove('has-banner');
        
        // 可選：在內容區域顯示桌面提示
        const contentText = document.querySelector('.content-text');
        if (contentText) {
            contentText.innerHTML = `
                請使用手機瀏覽此頁面
                <div class="desktop-hint">以體驗 App 開啟功能</div>
            `;
        }
        
        console.log('Desktop detected, App opener hidden');
        return; // 提早結束，不執行後續邏輯
    }
    
    // 行動裝置：繼續原有邏輯
    // 判斷是否為 iOS Safari，決定是否顯示我們的 banner
    const isIOSSafari = appOpener.isNativeSafari();
    
    const appBanner = document.getElementById('appBanner');
    const body = document.body;
    
    if (isIOSSafari) {
        // iOS Safari: 隱藏我們的 banner，讓原生 Smart App Banner 顯示
        appBanner.classList.add('hidden');
        body.classList.remove('has-banner');
    } else {
        // 其他情況: 顯示我們的 banner
        body.classList.add('has-banner');
    }
    
    // 綁定按鈕事件
    const openAppBtn = document.getElementById('openAppBtn');
    if (openAppBtn) {
        openAppBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 顯示載入狀態
            openAppBtn.classList.add('btn-loading');
            
            let timeoutId = null;
            let hasAppOpened = false;
            
            // 監聽頁面可見性變化
            const onVisibilityChange = () => {
                if (document.hidden) {
                    hasAppOpened = true;
                    // App 開啟成功，快速恢復按鈕狀態
                    setTimeout(() => {
                        openAppBtn.classList.remove('btn-loading');
                        // 同步重置 AppOpener 的狀態
                        appOpener.isOpening = false;
                    }, 100);
                }
            };
            
            // 監聽 blur 事件（備用）
            const onBlur = () => {
                hasAppOpened = true;
                setTimeout(() => {
                    openAppBtn.classList.remove('btn-loading');
                    // 同步重置 AppOpener 的狀態
                    appOpener.isOpening = false;
                }, 100);
            };
            
            // 清理函數
            const cleanup = () => {
                document.removeEventListener('visibilitychange', onVisibilityChange);
                window.removeEventListener('blur', onBlur);
                if (timeoutId) clearTimeout(timeoutId);
            };
            
            // 監聽事件
            document.addEventListener('visibilitychange', onVisibilityChange);
            window.addEventListener('blur', onBlur);
            
            // 短暫延遲後執行（更好的使用者體驗）
            setTimeout(() => {
                appOpener.open();
                
                // 設定 timeout，如果 App 沒開啟就恢復按鈕
                timeoutId = setTimeout(() => {
                    cleanup();
                    if (!hasAppOpened) {
                        openAppBtn.classList.remove('btn-loading');
                    }
                }, appOpener.config.timeout);
                
            }, appOpener.config.buttonClickDelay);
            
            // 頁面卸載時清理
            window.addEventListener('beforeunload', cleanup, { once: true });
        });
    }
    
    // 額外功能：自動開啟（如果需要）
    // 可以在 URL 參數中加入 autoOpen=true 來自動開啟
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoOpen') === 'true') {
        // 檢查是否為行動裝置和平台支援性
        if (appOpener.isMobile() && appOpener.platform !== 'unknown') {
            // 檢查是否為 bot 或爬蟲
            const isBot = /bot|crawler|spider|crawling/i.test(navigator.userAgent);
            
            if (!isBot) {
                setTimeout(() => {
                    const btn = document.getElementById('openAppBtn');
                    if (btn && !btn.classList.contains('btn-loading')) {
                        btn.click();
                    }
                }, appOpener.config.autoOpenDelay);
            } else {
                console.log('Bot detected, skipping autoOpen');
            }
        } else {
            console.log('Desktop or unsupported platform, skipping autoOpen');
        }
    }
});
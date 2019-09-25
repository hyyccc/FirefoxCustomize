// ==UserScript==
// @name		downloadPlus.uc.js
// @description	下载窗口添加:另存为、双击复制链接、第三方工具下载
// @include		main
// @include		chrome://mozapps/content/downloads/unknownContentType.xul
// @include		chrome://browser/content/places/places.xul
// @version		2019.09.25
// @startup		window.MDownloadPlus.init();
// @startup		window.removeDownloadfile.init();
// @note		修正另存为，新增链接类型不支持提示，新增第三方应用调用参数 by Ryan Lieu<github-benzBrake@woai.ru>
// @note		适配Firefox57+
// ==/UserScript==
(function () {
	const PREF_BD_USEDOWNLOADDIR = "browser.download.useDownloadDir";

	let config = {
		defaultActionToSave:true,//默认选择下载文件
		addSaveAsButton:true, //添加另存为按钮，只在选择了默认保存位置时添加（此功能FF68+）无效
		copySourceByDbClick:true,//来源显示完整目录并支持双击复制完整地址
		useExtraAppDownload:true,//使用第三方下载工具下载
		/* 迅雷示例 */
		extraAppName:"迅雷",//下载工具名称
		extraAppPath:"C:\\Program\ Files\ (x86)\\Thunder\ Network\\Program\\Thunder.exe", //下载工具路径
		extraAppParameter: [],//下载工具参数
		/* IDM */
		//extraAppName:"IDM",//下载工具名称
		//extraAppPath:"C:\\Program\ Files\ (x86)\\Internet\ Download\ Manager\\IDMan.exe", //下载工具路径
		//extraAppParameter: ["/d"],//下载工具参数
		_:false
	};
	
	function isUsableDirectory(aDirectory)
	{
		return aDirectory.exists() && aDirectory.isDirectory() &&
			aDirectory.isWritable();
	}
	
	var downloadModule = {};
	Components.utils.import("resource://gre/modules/DownloadLastDir.jsm", downloadModule);
	Components.utils.import("resource://gre/modules/Downloads.jsm");
	var MDownloadPlus = {
		createExtraAppButton:function () {
			let btn = dialog.mDialog.document.documentElement.getButton("extra2");
			if(btn){  
				btn.setAttribute("hidden", "false");
				btn.setAttribute("label", config.extraAppName);
				btn.setAttribute("oncommand", 'window.MDownloadPlus.lauchExtraApp();')
			}
		},
		lauchExtraApp:function () {
			let url = dialog.mLauncher.source.spec;
			let regEx = new RegExp("^data");
			if (regEx.test(url)) {
				alert("此类链接不支持调用第三方工具下载");
				return;
			}
			let parameter = config.extraAppParameter;
			parameter.push(url);
			let extraApp = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
			extraApp.initWithPath(config.extraAppPath);
			if (!extraApp.exists()) {
				alert("找不到" + config.extraAppName + "，请点击“火箭图标->自定义设置->下载设置”配置下载工具！");
				return;
			}
			try {
				let ss = Components.classes["@mozilla.org/browser/shell-service;1"]
					.getService(Components.interfaces.nsIShellService);
				ss.openApplicationWithURI(extraApp, parameter.join(" "));
			} catch (e) {
				let p = Components.classes["@mozilla.org/process/util;1"]
					.createInstance(Components.interfaces.nsIProcess);
				p.init(extraApp);
				p.run(false, parameter, parameter.length);
			}
			dialog.mDialog.dialog = null;
			window.close();
		},
		createSaveAsButton:function (){
			let prefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefBranch);
			let autodownload = prefs.getBoolPref(PREF_BD_USEDOWNLOADDIR, false);
			if(autodownload){
				var btn = dialog.mDialog.document.documentElement.getButton("extra1");
				if(btn){
					btn.setAttribute("hidden", "false");
					btn.setAttribute("label", "另存为");
					btn.setAttribute("oncommand", 'window.MDownloadPlus.saveAs();')
				}
			}
		},
		saveAs:function () {
			var mainWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
			mainWindow.eval("(" + mainWindow.internalSave.toString().replace("let ", "").replace("var fpParams", "fileInfo.fileExt=null;fileInfo.fileName=aDefaultFileName;var fpParams") + ")")(dialog.mLauncher.source.asciiSpec, null, (document.querySelector("#locationtext") ? document.querySelector("#locationtext").value : dialog.mLauncher.suggestedFileName), null, null, null, null, null, null, mainWindow.document, 0, null);
			close();
		},
		copySourceByDbClick:function () {
			var source = document.querySelector("#source");
			source.value = dialog.mSourcePath;
			source.setAttribute("crop", "center");
			source.setAttribute("tooltiptext", dialog.mLauncher.source.spec);
			source.setAttribute("ondblclick", 'Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper).copyString(dialog.mLauncher.source.spec)');
		},
		init:function () {
			if(config.defaultActionToSave){
				var modeGroup = dialog.dialogElement("mode");
				modeGroup.selectedItem = dialog.dialogElement("save");
			}

			if(config.addSaveAsButton){
				this.createSaveAsButton();
			}

			if(config.copySourceByDbClick){
				this.copySourceByDbClick();
			}

			if(config.useExtraAppDownload){
				this.createExtraAppButton();
				this.createIDMAppButton();
			}
		}
	}

	if (location.href.startsWith("chrome://mozapps/content/downloads/unknownContentType.x")) {
		MDownloadPlus.init();
		window.MDownloadPlus = MDownloadPlus;
		window.sizeToContent();
	}
})()
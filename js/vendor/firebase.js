var Mi=()=>{};var Fi=function(n){let e=[],t=0;for(let r=0;r<n.length;r++){let i=n.charCodeAt(r);i<128?e[t++]=i:i<2048?(e[t++]=i>>6|192,e[t++]=i&63|128):(i&64512)===55296&&r+1<n.length&&(n.charCodeAt(r+1)&64512)===56320?(i=65536+((i&1023)<<10)+(n.charCodeAt(++r)&1023),e[t++]=i>>18|240,e[t++]=i>>12&63|128,e[t++]=i>>6&63|128,e[t++]=i&63|128):(e[t++]=i>>12|224,e[t++]=i>>6&63|128,e[t++]=i&63|128)}return e},Ia=function(n){let e=[],t=0,r=0;for(;t<n.length;){let i=n[t++];if(i<128)e[r++]=String.fromCharCode(i);else if(i>191&&i<224){let s=n[t++];e[r++]=String.fromCharCode((i&31)<<6|s&63)}else if(i>239&&i<365){let s=n[t++],o=n[t++],a=n[t++],h=((i&7)<<18|(s&63)<<12|(o&63)<<6|a&63)-65536;e[r++]=String.fromCharCode(55296+(h>>10)),e[r++]=String.fromCharCode(56320+(h&1023))}else{let s=n[t++],o=n[t++];e[r++]=String.fromCharCode((i&15)<<12|(s&63)<<6|o&63)}}return e.join("")},xi={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(n,e){if(!Array.isArray(n))throw Error("encodeByteArray takes an array as a parameter");this.init_();let t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let i=0;i<n.length;i+=3){let s=n[i],o=i+1<n.length,a=o?n[i+1]:0,h=i+2<n.length,m=h?n[i+2]:0,y=s>>2,E=(s&3)<<4|a>>4,T=(a&15)<<2|m>>6,N=m&63;h||(N=64,o||(T=64)),r.push(t[y],t[E],t[T],t[N])}return r.join("")},encodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(n):this.encodeByteArray(Fi(n),e)},decodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(n):Ia(this.decodeStringToByteArray(n,e))},decodeStringToByteArray(n,e){this.init_();let t=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let i=0;i<n.length;){let s=t[n.charAt(i++)],a=i<n.length?t[n.charAt(i)]:0;++i;let m=i<n.length?t[n.charAt(i)]:64;++i;let E=i<n.length?t[n.charAt(i)]:64;if(++i,s==null||a==null||m==null||E==null)throw new jn;let T=s<<2|a>>4;if(r.push(T),m!==64){let N=a<<4&240|m>>2;if(r.push(N),E!==64){let S=m<<6&192|E;r.push(S)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let n=0;n<this.ENCODED_VALS.length;n++)this.byteToCharMap_[n]=this.ENCODED_VALS.charAt(n),this.charToByteMap_[this.byteToCharMap_[n]]=n,this.byteToCharMapWebSafe_[n]=this.ENCODED_VALS_WEBSAFE.charAt(n),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[n]]=n,n>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(n)]=n,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(n)]=n)}}},jn=class extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}},Ea=function(n){let e=Fi(n);return xi.encodeByteArray(e,!0)},Ze=function(n){return Ea(n).replace(/\./g,"")},Mt=function(n){try{return xi.decodeString(n,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};function wa(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}var Ta=()=>wa().__FIREBASE_DEFAULTS__,va=()=>{if(typeof process>"u"||typeof process.env>"u")return;let n=process.env.__FIREBASE_DEFAULTS__;if(n)return JSON.parse(n)},Aa=()=>{if(typeof document>"u")return;let n;try{n=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}let e=n&&Mt(n[1]);return e&&JSON.parse(e)},Gn=()=>{try{return Mi()||Ta()||va()||Aa()}catch(n){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${n}`);return}},Kn=n=>Gn()?.emulatorHosts?.[n],qi=n=>{let e=Kn(n);if(!e)return;let t=e.lastIndexOf(":");if(t<=0||t+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);let r=parseInt(e.substring(t+1),10);return e[0]==="["?[e.substring(1,t-1),r]:[e.substring(0,t),r]},Jn=()=>Gn()?.config,Yn=n=>Gn()?.[`_${n}`];var Ve=class{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,r)=>{t?this.reject(t):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,r))}}};function $i(n,e){if(n.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');let t={alg:"none",type:"JWT"},r=e||"demo-project",i=n.iat||0,s=n.sub||n.user_id;if(!s)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");let o={iss:`https://securetoken.google.com/${r}`,aud:r,iat:i,exp:i+3600,auth_time:i,sub:s,user_id:s,firebase:{sign_in_provider:"custom",identities:{}},...n};return[Ze(JSON.stringify(t)),Ze(JSON.stringify(o)),""].join(".")}function V(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function Bi(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(V())}function Wi(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function Hi(){let n=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof n=="object"&&n.id!==void 0}function ji(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function zi(){let n=V();return n.indexOf("MSIE ")>=0||n.indexOf("Trident/")>=0}function Gi(){try{return typeof indexedDB=="object"}catch{return!1}}function Ki(){return new Promise((n,e)=>{try{let t=!0,r="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(r);i.onsuccess=()=>{i.result.close(),t||self.indexedDB.deleteDatabase(r),n(!0)},i.onupgradeneeded=()=>{t=!1},i.onerror=()=>{e(i.error?.message||"")}}catch(t){e(t)}})}var ba="FirebaseError",$=class n extends Error{constructor(e,t,r){super(t),this.code=e,this.customData=r,this.name=ba,Object.setPrototypeOf(this,n.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,re.prototype.create)}},re=class{constructor(e,t,r){this.service=e,this.serviceName=t,this.errors=r}create(e,...t){let r=t[0]||{},i=`${this.service}/${e}`,s=this.errors[e],o=s?Sa(s,r):"Error",a=`${this.serviceName}: ${o} (${i}).`;return new $(i,a,r)}};function Sa(n,e){try{let t=0,r="";for(;t<n.length;){let i=n.indexOf("{$",t);if(i===-1){r+=n.substring(t);break}let s=n.indexOf("}",i+2);if(s===-1){r+=n.substring(t);break}let o=n.substring(i+2,s),a=e[o];r+=n.substring(t,i)+(a!=null?String(a):`<${o}?>`),t=s+1}return r}catch{return n}}function Ji(n){for(let e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}function G(n,e){if(n===e)return!0;let t=Object.keys(n),r=Object.keys(e);for(let i of t){if(!r.includes(i))return!1;let s=n[i],o=e[i];if(Ui(s)&&Ui(o)){if(!G(s,o))return!1}else if(s!==o)return!1}for(let i of r)if(!t.includes(i))return!1;return!0}function Ui(n){return n!==null&&typeof n=="object"}function Me(n){let e=[];for(let[t,r]of Object.entries(n))Array.isArray(r)?r.forEach(i=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(i))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(r));return e.length?"&"+e.join("&"):""}function Ue(n){let e={};return n.replace(/^\?/,"").split("&").forEach(r=>{if(r){let[i,s]=r.split("=");e[decodeURIComponent(i)]=decodeURIComponent(s)}}),e}function Fe(n){let e=n.indexOf("?");if(!e)return"";let t=n.indexOf("#",e);return n.substring(e,t>0?t:void 0)}function Yi(n,e){let t=new zn(n,e);return t.subscribe.bind(t)}var zn=class{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(r=>{this.error(r)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,r){let i;if(e===void 0&&t===void 0&&r===void 0)throw new Error("Missing Observer.");Ra(e,["next","error","complete"])?i=e:i={next:e,error:t,complete:r},i.next===void 0&&(i.next=Hn),i.error===void 0&&(i.error=Hn),i.complete===void 0&&(i.complete=Hn);let s=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?i.error(this.finalError):i.complete()}catch{}}),this.observers.push(i),s}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(r){typeof console<"u"&&console.error&&console.error(r)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}};function Ra(n,e){if(typeof n!="object"||n===null)return!1;for(let t of e)if(t in n&&typeof n[t]=="function")return!0;return!1}function Hn(){}var eh=4*60*60*1e3;function P(n){return n&&n._delegate?n._delegate:n}function ve(n){try{return(n.startsWith("http://")||n.startsWith("https://")?new URL(n).hostname:n).endsWith(".cloudworkstations.dev")}catch{return!1}}async function Ut(n){return(await fetch(n,{credentials:"include"})).ok}var W=class{constructor(e,t,r){this.name=e,this.instanceFactory=t,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}};var Ae="[DEFAULT]";var Qn=class{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){let t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){let r=new Ve;if(this.instancesDeferred.set(t,r),this.isInitialized(t)||this.shouldAutoInitialize())try{let i=this.getOrInitializeService({instanceIdentifier:t});i&&r.resolve(i)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){let t=this.normalizeInstanceIdentifier(e?.identifier),r=e?.optional??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(i){if(r)return null;throw i}else{if(r)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(Na(e))try{this.getOrInitializeService({instanceIdentifier:Ae})}catch{}for(let[t,r]of this.instancesDeferred.entries()){let i=this.normalizeInstanceIdentifier(t);try{let s=this.getOrInitializeService({instanceIdentifier:i});r.resolve(s)}catch{}}}}clearInstance(e=Ae){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){let e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=Ae){return this.instances.has(e)}getOptions(e=Ae){return this.instancesOptions.get(e)||{}}initialize(e={}){let{options:t={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);let i=this.getOrInitializeService({instanceIdentifier:r,options:t});for(let[s,o]of this.instancesDeferred.entries()){let a=this.normalizeInstanceIdentifier(s);r===a&&o.resolve(i)}return i}onInit(e,t){let r=this.normalizeInstanceIdentifier(t),i=this.onInitCallbacks.get(r)??new Set;i.add(e),this.onInitCallbacks.set(r,i);let s=this.instances.get(r);return s&&e(s,r),()=>{i.delete(e)}}invokeOnInitCallbacks(e,t){let r=this.onInitCallbacks.get(t);if(r)for(let i of r)try{i(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:Pa(e),options:t}),this.instances.set(e,r),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=Ae){return this.component?this.component.multipleInstances?e:Ae:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}};function Pa(n){return n===Ae?void 0:n}function Na(n){return n.instantiationMode==="EAGER"}var Ft=class{constructor(e){this.name=e,this.providers=new Map}addComponent(e){let t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);let t=new Qn(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}};var ka=[],A;(function(n){n[n.DEBUG=0]="DEBUG",n[n.VERBOSE=1]="VERBOSE",n[n.INFO=2]="INFO",n[n.WARN=3]="WARN",n[n.ERROR=4]="ERROR",n[n.SILENT=5]="SILENT"})(A||(A={}));var Ca={debug:A.DEBUG,verbose:A.VERBOSE,info:A.INFO,warn:A.WARN,error:A.ERROR,silent:A.SILENT},Da=A.INFO,Oa={[A.DEBUG]:"log",[A.VERBOSE]:"log",[A.INFO]:"info",[A.WARN]:"warn",[A.ERROR]:"error"},La=(n,e,...t)=>{if(e<n.logLevel)return;let r=new Date().toISOString(),i=Oa[e];if(i)console[i](`[${r}]  ${n.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)},he=class{constructor(e){this.name=e,this._logLevel=Da,this._logHandler=La,this._userLogHandler=null,ka.push(this)}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in A))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?Ca[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,A.DEBUG,...e),this._logHandler(this,A.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,A.VERBOSE,...e),this._logHandler(this,A.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,A.INFO,...e),this._logHandler(this,A.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,A.WARN,...e),this._logHandler(this,A.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,A.ERROR,...e),this._logHandler(this,A.ERROR,...e)}};var Va=(n,e)=>e.some(t=>n instanceof t),Qi,Xi;function Ma(){return Qi||(Qi=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function Ua(){return Xi||(Xi=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}var Zi=new WeakMap,Zn=new WeakMap,es=new WeakMap,Xn=new WeakMap,tr=new WeakMap;function Fa(n){let e=new Promise((t,r)=>{let i=()=>{n.removeEventListener("success",s),n.removeEventListener("error",o)},s=()=>{t(Q(n.result)),i()},o=()=>{r(n.error),i()};n.addEventListener("success",s),n.addEventListener("error",o)});return e.then(t=>{t instanceof IDBCursor&&Zi.set(t,n)}).catch(()=>{}),tr.set(e,n),e}function xa(n){if(Zn.has(n))return;let e=new Promise((t,r)=>{let i=()=>{n.removeEventListener("complete",s),n.removeEventListener("error",o),n.removeEventListener("abort",o)},s=()=>{t(),i()},o=()=>{r(n.error||new DOMException("AbortError","AbortError")),i()};n.addEventListener("complete",s),n.addEventListener("error",o),n.addEventListener("abort",o)});Zn.set(n,e)}var er={get(n,e,t){if(n instanceof IDBTransaction){if(e==="done")return Zn.get(n);if(e==="objectStoreNames")return n.objectStoreNames||es.get(n);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return Q(n[e])},set(n,e,t){return n[e]=t,!0},has(n,e){return n instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in n}};function ts(n){er=n(er)}function qa(n){return n===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){let r=n.call(xt(this),e,...t);return es.set(r,e.sort?e.sort():[e]),Q(r)}:Ua().includes(n)?function(...e){return n.apply(xt(this),e),Q(Zi.get(this))}:function(...e){return Q(n.apply(xt(this),e))}}function $a(n){return typeof n=="function"?qa(n):(n instanceof IDBTransaction&&xa(n),Va(n,Ma())?new Proxy(n,er):n)}function Q(n){if(n instanceof IDBRequest)return Fa(n);if(Xn.has(n))return Xn.get(n);let e=$a(n);return e!==n&&(Xn.set(n,e),tr.set(e,n)),e}var xt=n=>tr.get(n);function rs(n,e,{blocked:t,upgrade:r,blocking:i,terminated:s}={}){let o=indexedDB.open(n,e),a=Q(o);return r&&o.addEventListener("upgradeneeded",h=>{r(Q(o.result),h.oldVersion,h.newVersion,Q(o.transaction),h)}),t&&o.addEventListener("blocked",h=>t(h.oldVersion,h.newVersion,h)),a.then(h=>{s&&h.addEventListener("close",()=>s()),i&&h.addEventListener("versionchange",m=>i(m.oldVersion,m.newVersion,m))}).catch(()=>{}),a}var Ba=["get","getKey","getAll","getAllKeys","count"],Wa=["put","add","delete","clear"],nr=new Map;function ns(n,e){if(!(n instanceof IDBDatabase&&!(e in n)&&typeof e=="string"))return;if(nr.get(e))return nr.get(e);let t=e.replace(/FromIndex$/,""),r=e!==t,i=Wa.includes(t);if(!(t in(r?IDBIndex:IDBObjectStore).prototype)||!(i||Ba.includes(t)))return;let s=async function(o,...a){let h=this.transaction(o,i?"readwrite":"readonly"),m=h.store;return r&&(m=m.index(a.shift())),(await Promise.all([m[t](...a),i&&h.done]))[0]};return nr.set(e,s),s}ts(n=>({...n,get:(e,t,r)=>ns(e,t)||n.get(e,t,r),has:(e,t)=>!!ns(e,t)||n.has(e,t)}));var ir=class{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(Ha(t)){let r=t.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(t=>t).join(" ")}};function Ha(n){return n.getComponent()?.type==="VERSION"}var sr="@firebase/app",is="0.16.2";var se=new he("@firebase/app"),ja="@firebase/app-compat",za="@firebase/analytics-compat",Ga="@firebase/analytics",Ka="@firebase/app-check-compat",Ja="@firebase/app-check",Ya="@firebase/auth",Qa="@firebase/auth-compat",Xa="@firebase/database",Za="@firebase/data-connect",ec="@firebase/database-compat",tc="@firebase/functions",nc="@firebase/functions-compat",rc="@firebase/installations",ic="@firebase/installations-compat",sc="@firebase/messaging",oc="@firebase/messaging-compat",ac="@firebase/performance",cc="@firebase/performance-compat",uc="@firebase/remote-config",lc="@firebase/remote-config-compat",hc="@firebase/storage",dc="@firebase/storage-compat",fc="@firebase/firestore",pc="@firebase/ai",mc="@firebase/firestore-compat",gc="firebase",_c="12.19.0";var or="[DEFAULT]",yc={[sr]:"fire-core",[ja]:"fire-core-compat",[Ga]:"fire-analytics",[za]:"fire-analytics-compat",[Ja]:"fire-app-check",[Ka]:"fire-app-check-compat",[Ya]:"fire-auth",[Qa]:"fire-auth-compat",[Xa]:"fire-rtdb",[Za]:"fire-data-connect",[ec]:"fire-rtdb-compat",[tc]:"fire-fn",[nc]:"fire-fn-compat",[rc]:"fire-iid",[ic]:"fire-iid-compat",[sc]:"fire-fcm",[oc]:"fire-fcm-compat",[ac]:"fire-perf",[cc]:"fire-perf-compat",[uc]:"fire-rc",[lc]:"fire-rc-compat",[hc]:"fire-gcs",[dc]:"fire-gcs-compat",[fc]:"fire-fst",[mc]:"fire-fst-compat",[pc]:"fire-vertex","fire-js":"fire-js",[gc]:"fire-js-all"};var qt=new Map,Ic=new Map,ar=new Map;function ss(n,e){try{n.container.addComponent(e)}catch(t){se.debug(`Component ${e.name} failed to register with FirebaseApp ${n.name}`,t)}}function de(n){let e=n.name;if(ar.has(e))return se.debug(`There were multiple attempts to register component ${e}.`),!1;ar.set(e,n);for(let t of qt.values())ss(t,n);for(let t of Ic.values())ss(t,n);return!0}function tt(n,e){let t=n.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),n.container.getProvider(e)}function x(n){return n==null?!1:n.settings!==void 0}var Ec={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different {$mismatchedParam}. Existing: '{$oldValue}'. New: '{$newValue}'.","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},ie=new re("app","Firebase",Ec);var cr=class{constructor(e,t,r){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new W("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw ie.create("app-deleted",{appName:this._name})}};var fe=_c;function us(n,e={}){let t=n;typeof e!="object"&&(e={name:e});let r={name:or,automaticDataCollectionEnabled:!0,...e},i=r.name;if(typeof i!="string"||!i)throw ie.create("bad-app-name",{appName:String(i)});if(t||(t=Jn()),!t)throw ie.create("no-options");let s=qt.get(i);if(s)if(G(t,s.options)){if(G(r,s.config))return s;throw ie.create("duplicate-app",{appName:i,mismatchedParam:"config",oldValue:JSON.stringify(s.config),newValue:JSON.stringify(r)})}else throw ie.create("duplicate-app",{appName:i,mismatchedParam:"options",oldValue:JSON.stringify(s.options),newValue:JSON.stringify(t)});let o=new Ft(i);for(let h of ar.values())o.addComponent(h);let a=new cr(t,r,o);return qt.set(i,a),a}function $t(n=or){let e=qt.get(n);if(!e&&n===or&&Jn())return us();if(!e)throw ie.create("no-app",{appName:n});return e}function K(n,e,t){let r=yc[n]??n;t&&(r+=`-${t}`);let i=r.match(/\s|\//),s=e.match(/\s|\//);if(i||s){let o=[`Unable to register library "${r}" with version "${e}":`];i&&o.push(`library name "${r}" contains illegal characters (whitespace or "/")`),i&&s&&o.push("and"),s&&o.push(`version name "${e}" contains illegal characters (whitespace or "/")`),se.warn(o.join(" "));return}de(new W(`${r}-version`,()=>({library:r,version:e}),"VERSION"))}var wc="firebase-heartbeat-database",Tc=1,et="firebase-heartbeat-store",rr=null;function ls(){return rr||(rr=rs(wc,Tc,{upgrade:(n,e)=>{switch(e){case 0:try{n.createObjectStore(et)}catch(t){console.warn(t)}}}}).catch(n=>{throw ie.create("idb-open",{originalErrorMessage:n.message})})),rr}async function vc(n){try{let t=(await ls()).transaction(et),r=await t.objectStore(et).get(hs(n));return await t.done,r}catch(e){if(e instanceof $)se.warn(e.message);else{let t=ie.create("idb-get",{originalErrorMessage:e?.message});se.warn(t.message)}}}async function os(n,e){try{let r=(await ls()).transaction(et,"readwrite");await r.objectStore(et).put(e,hs(n)),await r.done}catch(t){if(t instanceof $)se.warn(t.message);else{let r=ie.create("idb-set",{originalErrorMessage:t?.message});se.warn(r.message)}}}function hs(n){return`${n.name}!${n.options.appId}`}var Ac=1024,bc=30,ur=class{constructor(e){this.container=e,this._heartbeatsCache=null;let t=this.container.getProvider("app").getImmediate();this._storage=new lr(t),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){try{let t=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),r=as();if(this._heartbeatsCache?.heartbeats==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null)||this._heartbeatsCache.lastSentHeartbeatDate===r||this._heartbeatsCache.heartbeats.some(i=>i.date===r))return;if(this._heartbeatsCache.heartbeats.push({date:r,agent:t}),this._heartbeatsCache.heartbeats.length>bc){let i=Rc(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(i,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(e){se.warn(e)}}async getHeartbeatsHeader(){try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null||this._heartbeatsCache.heartbeats.length===0)return"";let e=as(),{heartbeatsToSend:t,unsentEntries:r}=Sc(this._heartbeatsCache.heartbeats),i=Ze(JSON.stringify({version:2,heartbeats:t}));return this._heartbeatsCache.lastSentHeartbeatDate=e,r.length>0?(this._heartbeatsCache.heartbeats=r,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),i}catch(e){return se.warn(e),""}}};function as(){return new Date().toISOString().substring(0,10)}function Sc(n,e=Ac){let t=[],r=n.slice();for(let i of n){let s=t.find(o=>o.agent===i.agent);if(s){if(s.dates.push(i.date),cs(t)>e){s.dates.pop();break}}else if(t.push({agent:i.agent,dates:[i.date]}),cs(t)>e){t.pop();break}r=r.slice(1)}return{heartbeatsToSend:t,unsentEntries:r}}var lr=class{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Gi()?Ki().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){let t=await vc(this.app);return t?.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){let r=await this.read();return os(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){let r=await this.read();return os(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:[...r.heartbeats,...e.heartbeats]})}else return}};function cs(n){return Ze(JSON.stringify({version:2,heartbeats:n})).length}function Rc(n){if(n.length===0)return-1;let e=0,t=n[0].date;for(let r=1;r<n.length;r++)n[r].date<t&&(t=n[r].date,e=r);return e}function Pc(n){de(new W("platform-logger",e=>new ir(e),"PRIVATE")),de(new W("heartbeat",e=>new ur(e),"PRIVATE")),K(sr,is,n),K(sr,is,"esm2020"),K("fire-js","")}Pc("");var Nc="firebase",kc="12.19.0";K(Nc,kc,"app");function Cs(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}var Ds=Cs,Os=new re("auth","Firebase",Cs());var Jt=new he("@firebase/auth");function Wt(n,...e){Jt.logLevel<=A.WARN&&Jt.warn(`Auth (${fe}): ${n}`,...e)}function Ht(n,...e){Jt.logLevel<=A.ERROR&&Jt.error(`Auth (${fe}): ${n}`,...e)}function H(n,...e){throw Or(n,...e)}function J(n,...e){return Or(n,...e)}function yn(n,e,t){let r={...Ds(),[e]:t};return new re("auth","Firebase",r).create(e,{appName:n.name})}function ge(n){return yn(n,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function Cc(n,e,t){let r=t;if(!(e instanceof r))throw r.name!==e.constructor.name&&H(n,"argument-error"),yn(n,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function Or(n,...e){if(typeof n!="string"){let t=e[0],r=[...e.slice(1)];return r[0]&&(r[0].appName=n.name),n._errorFactory.create(t,...r)}return Os.create(n,...e)}function I(n,e,...t){if(!n)throw Or(e,...t)}function X(n){let e="INTERNAL ASSERTION FAILED: "+n;throw Ht(e),new Error(e)}function ae(n,e){n||X(e)}function gr(){return typeof self<"u"&&self.location?.href||""}function Dc(){return ds()==="http:"||ds()==="https:"}function ds(){return typeof self<"u"&&self.location?.protocol||null}function Oc(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(Dc()||Hi()||"connection"in navigator)?navigator.onLine:!0}function Lc(){if(typeof navigator>"u")return null;let n=navigator;return n.languages&&n.languages[0]||n.language||null}var be=class{constructor(e,t){this.shortDelay=e,this.longDelay=t,ae(t>e,"Short delay should be less than long delay!"),this.isMobile=Bi()||ji()}get(){return Oc()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}};function Lr(n,e){ae(n.emulator,"Emulator should always be set here");let{url:t}=n.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}var Yt=class{static initialize(e,t,r){this.fetchImpl=e,t&&(this.headersImpl=t),r&&(this.responseImpl=r)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;X("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;X("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;X("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}};var Vc={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};var Mc=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],Uc=new be(3e4,6e4);function k(n,e){return n.tenantId&&!e.tenantId?{...e,tenantId:n.tenantId}:e}async function O(n,e,t,r,i={}){return Ls(n,i,async()=>{let s={},o={};r&&(e==="GET"?o=r:s={body:JSON.stringify(r)});let a=Me({...o,key:n.config.apiKey}).slice(1),h=await n._getAdditionalHeaders();h["Content-Type"]="application/json",n.languageCode&&(h["X-Firebase-Locale"]=n.languageCode);let m={method:e,headers:h,...s};return Wi()||(m.referrerPolicy="strict-origin-when-cross-origin"),n.emulatorConfig&&ve(n.emulatorConfig.host)&&(m.credentials="include"),Yt.fetch()(await Vs(n,n.config.apiHost,t,a),m)})}async function Ls(n,e,t){n._canInitEmulator=!1;let r={...Vc,...e};try{let i=new _r(n),s=await Promise.race([t(),i.promise]);i.clearNetworkTimeout();let o=await s.json();if("needConfirmation"in o)throw rt(n,"account-exists-with-different-credential",o);if(s.ok&&!("errorMessage"in o))return o;{let a=s.ok?o.errorMessage:o.error.message,[h,m]=a.split(" : ");if(h==="FEDERATED_USER_ID_ALREADY_LINKED")throw rt(n,"credential-already-in-use",o);if(h==="EMAIL_EXISTS")throw rt(n,"email-already-in-use",o);if(h==="USER_DISABLED")throw rt(n,"user-disabled",o);let y=r[h]||h.toLowerCase().replace(/[_\s]+/g,"-");if(m)throw yn(n,y,m);H(n,y)}}catch(i){if(i instanceof $)throw i;H(n,"network-request-failed",{message:String(i)})}}async function ke(n,e,t,r,i={}){let s=await O(n,e,t,r,i);return"mfaPendingCredential"in s&&H(n,"multi-factor-auth-required",{_serverResponse:s}),s}async function Vs(n,e,t,r){let i=`${e}${t}?${r}`,s=n,o=s.config.emulator?Lr(n.config,i):`${n.config.apiScheme}://${i}`;return Mc.includes(t)&&(await s._persistenceManagerAvailable,s._getPersistenceType()==="COOKIE")?s._getPersistence()._getFinalTarget(o).toString():o}function Fc(n){switch(n){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}var _r=class{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,r)=>{this.timer=setTimeout(()=>r(J(this.auth,"network-request-failed")),Uc.get())})}};function rt(n,e,t){let r={appName:n.name};t.email&&(r.email=t.email),t.phoneNumber&&(r.phoneNumber=t.phoneNumber);let i=J(n,e,r);return i.customData._tokenResponse=t,i}function fs(n){return n!==void 0&&n.enterprise!==void 0}var Qt=class{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(let t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return Fc(t.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}};async function Ms(n,e){return O(n,"GET","/v2/recaptchaConfig",k(n,e))}async function xc(n,e){return O(n,"POST","/v1/accounts:delete",e)}async function Xt(n,e){return O(n,"POST","/v1/accounts:lookup",e)}function it(n){if(n)try{let e=new Date(Number(n));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function Us(n,e=!1){let t=P(n),r=await t.getIdToken(e),i=Vr(r);I(i&&i.exp&&i.auth_time&&i.iat,t.auth,"internal-error");let s=typeof i.firebase=="object"?i.firebase:void 0,o=s?.sign_in_provider;return{claims:i,token:r,authTime:it(hr(i.auth_time)),issuedAtTime:it(hr(i.iat)),expirationTime:it(hr(i.exp)),signInProvider:o||null,signInSecondFactor:s?.sign_in_second_factor||null}}function hr(n){return Number(n)*1e3}function Vr(n){let[e,t,r]=n.split(".");if(e===void 0||t===void 0||r===void 0)return Ht("JWT malformed, contained fewer than 3 sections"),null;try{let i=Mt(t);return i?JSON.parse(i):(Ht("Failed to decode base64 JWT payload"),null)}catch(i){return Ht("Caught error parsing JWT payload as JSON",i?.toString()),null}}function ps(n){let e=Vr(n);return I(e,"internal-error"),I(typeof e.exp<"u","internal-error"),I(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}async function ct(n,e,t=!1){if(t)return e;try{return await e}catch(r){throw r instanceof $&&qc(r)&&n.auth.currentUser===n&&await n.auth.signOut(),r}}function qc({code:n}){return n==="auth/user-disabled"||n==="auth/user-token-expired"}var yr=class{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){let t=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),t}else{this.errorBackoff=3e4;let r=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,r)}}schedule(e=!1){if(!this.isRunning)return;let t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){e?.code==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}};var ut=class{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=it(this.lastLoginAt),this.creationTime=it(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}};async function lt(n){let e=n.auth,t=await n.getIdToken(),r=await ct(n,Xt(e,{idToken:t}));I(r?.users.length,e,"internal-error");let i=r.users[0];n._notifyReloadListener(i);let s=i.providerUserInfo?.length?xs(i.providerUserInfo):[],o=$c(n.providerData,s),a=n.isAnonymous,h=!(n.email&&i.passwordHash)&&!o?.length,m=a?h:!1,y={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:o,metadata:new ut(i.createdAt,i.lastLoginAt),isAnonymous:m};Object.assign(n,y)}async function Fs(n){let e=P(n);await lt(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function $c(n,e){return[...n.filter(r=>!e.some(i=>i.providerId===r.providerId)),...e]}function xs(n){return n.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}async function Bc(n,e){let t=await Ls(n,{},async()=>{let r=Me({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:i,apiKey:s}=n.config,o=await Vs(n,i,"/v1/token",`key=${s}`),a=await n._getAdditionalHeaders();a["Content-Type"]="application/x-www-form-urlencoded";let h={method:"POST",headers:a,body:r};return n.emulatorConfig&&ve(n.emulatorConfig.host)&&(h.credentials="include"),Yt.fetch()(o,h)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function Wc(n,e){return O(n,"POST","/v2/accounts:revokeToken",k(n,e))}var st=class n{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){I(e.idToken,"internal-error"),I(typeof e.idToken<"u","internal-error"),I(typeof e.refreshToken<"u","internal-error");let t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):ps(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){I(e.length!==0,"internal-error");let t=ps(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(I(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){let{accessToken:r,refreshToken:i,expiresIn:s}=await Bc(e,t);this.updateTokensAndExpiration(r,i,Number(s))}updateTokensAndExpiration(e,t,r){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+r*1e3}static fromJSON(e,t){let{refreshToken:r,accessToken:i,expirationTime:s}=t,o=new n;return r&&(I(typeof r=="string","internal-error",{appName:e}),o.refreshToken=r),i&&(I(typeof i=="string","internal-error",{appName:e}),o.accessToken=i),s&&(I(typeof s=="number","internal-error",{appName:e}),o.expirationTime=s),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new n,this.toJSON())}_performRefresh(){return X("not implemented")}};function pe(n,e){I(typeof n=="string"||typeof n>"u","internal-error",{appName:e})}var me=class n{constructor({uid:e,auth:t,stsTokenManager:r,...i}){this.providerId="firebase",this.proactiveRefresh=new yr(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=r,this.accessToken=r.accessToken,this.displayName=i.displayName||null,this.email=i.email||null,this.emailVerified=i.emailVerified||!1,this.phoneNumber=i.phoneNumber||null,this.photoURL=i.photoURL||null,this.isAnonymous=i.isAnonymous||!1,this.tenantId=i.tenantId||null,this.providerData=i.providerData?[...i.providerData]:[],this.metadata=new ut(i.createdAt||void 0,i.lastLoginAt||void 0)}async getIdToken(e){let t=await ct(this,this.stsTokenManager.getToken(this.auth,e));return I(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return Us(this,e)}reload(){return Fs(this)}_assign(e){this!==e&&(I(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>({...t})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){let t=new n({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){I(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),t&&await lt(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(x(this.auth.app))return Promise.reject(ge(this.auth));let e=await this.getIdToken();return await ct(this,xc(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){let r=t.displayName??void 0,i=t.email??void 0,s=t.phoneNumber??void 0,o=t.photoURL??void 0,a=t.tenantId??void 0,h=t._redirectEventId??void 0,m=t.createdAt??void 0,y=t.lastLoginAt??void 0,{uid:E,emailVerified:T,isAnonymous:N,providerData:S,stsTokenManager:D}=t;I(E&&D,e,"internal-error");let R=st.fromJSON(this.name,D);I(typeof E=="string",e,"internal-error"),pe(r,e.name),pe(i,e.name),I(typeof T=="boolean",e,"internal-error"),I(typeof N=="boolean",e,"internal-error"),pe(s,e.name),pe(o,e.name),pe(a,e.name),pe(h,e.name),pe(m,e.name),pe(y,e.name);let le=new n({uid:E,auth:e,email:i,emailVerified:T,displayName:r,isAnonymous:N,photoURL:o,phoneNumber:s,tenantId:a,stsTokenManager:R,createdAt:m,lastLoginAt:y});return S&&Array.isArray(S)&&(le.providerData=S.map(Oe=>({...Oe}))),h&&(le._redirectEventId=h),le}static async _fromIdTokenResponse(e,t,r=!1){let i=new st;i.updateFromServerResponse(t);let s=new n({uid:t.localId,auth:e,stsTokenManager:i,isAnonymous:r});return await lt(s),s}static async _fromGetAccountInfoResponse(e,t,r){let i=t.users[0];I(i.localId!==void 0,"internal-error");let s=i.providerUserInfo!==void 0?xs(i.providerUserInfo):[],o=!(i.email&&i.passwordHash)&&!s?.length,a=new st;a.updateFromIdToken(r);let h=new n({uid:i.localId,auth:e,stsTokenManager:a,isAnonymous:o}),m={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:s,metadata:new ut(i.createdAt,i.lastLoginAt),isAnonymous:!(i.email&&i.passwordHash)&&!s?.length};return Object.assign(h,m),h}};var ms=new Map;function oe(n){ae(n instanceof Function,"Expected a class definition");let e=ms.get(n);return e?(ae(e instanceof n,"Instance stored in cache mismatched with class"),e):(e=new n,ms.set(n,e),e)}var Zt=class{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){let t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}};Zt.type="NONE";var Ir=Zt;function jt(n,e,t){return`firebase:${n}:${e}:${t}`}var ot=class n{constructor(e,t,r){this.persistence=e,this.auth=t,this.userKey=r;let{config:i,name:s}=this.auth;this.fullUserKey=jt(this.userKey,i.apiKey,s),this.fullPersistenceKey=jt("persistence",i.apiKey,s),this.boundEventHandler=t._onStorageEvent.bind(t);try{this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}catch{}}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){let e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){let t=await Xt(this.auth,{idToken:e}).catch(()=>{});return t?me._fromGetAccountInfoResponse(this.auth,t,e):null}return me._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;let t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){try{this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}catch{}}static async create(e,t,r="authUser"){if(!t.length)return new n(oe(Ir),e,r);let i=(await Promise.all(t.map(async m=>{try{if(await m._isAvailable())return m}catch{return}}))).filter(m=>m),s=i[0]||oe(Ir),o=jt(r,e.config.apiKey,e.name),a=null;for(let m of t)try{let y=await m._get(o);if(y){let E;if(typeof y=="string"){let T=await Xt(e,{idToken:y}).catch(()=>{});if(!T)break;E=await me._fromGetAccountInfoResponse(e,T,y)}else E=me._fromJSON(e,y);m!==s&&(a=E),s=m;break}}catch{}let h=i.filter(m=>m._shouldAllowMigration);return!s._shouldAllowMigration||!h.length?new n(s,e,r):(s=h[0],a&&await s._set(o,a.toJSON()),await Promise.all(t.map(async m=>{if(m!==s)try{await m._remove(o)}catch{}})),new n(s,e,r))}};function gs(n){let e=n.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(Ws(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(qs(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(js(e))return"Blackberry";if(zs(e))return"Webos";if($s(e))return"Safari";if((e.includes("chrome/")||Bs(e))&&!e.includes("edge/"))return"Chrome";if(Hs(e))return"Android";{let t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,r=n.match(t);if(r?.length===2)return r[1]}return"Other"}function qs(n=V()){return/firefox\//i.test(n)}function $s(n=V()){let e=n.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function Bs(n=V()){return/crios\//i.test(n)}function Ws(n=V()){return/iemobile/i.test(n)}function Hs(n=V()){return/android/i.test(n)}function js(n=V()){return/blackberry/i.test(n)}function zs(n=V()){return/webos/i.test(n)}function Mr(n=V()){return/iphone|ipad|ipod/i.test(n)||/macintosh/i.test(n)&&/mobile/i.test(n)}function Hc(n=V()){return Mr(n)&&!!window.navigator?.standalone}function jc(){return zi()&&document.documentMode===10}function Gs(n=V()){return Mr(n)||Hs(n)||zs(n)||js(n)||/windows phone/i.test(n)||Ws(n)}function Ks(n,e=[]){let t;switch(n){case"Browser":t=gs(V());break;case"Worker":t=`${gs(V())}-${n}`;break;default:t=n}let r=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${fe}/${r}`}var Er=class{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){let r=s=>new Promise((o,a)=>{try{let h=e(s);o(h)}catch(h){a(h)}});r.onAbort=t,this.queue.push(r);let i=this.queue.length-1;return()=>{this.queue[i]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;let t=[];try{for(let r of this.queue)await r(e),r.onAbort&&t.push(r.onAbort)}catch(r){t.reverse();for(let i of t)try{i()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:r?.message})}}};async function zc(n,e={}){return O(n,"GET","/v2/passwordPolicy",k(n,e))}var Gc=6,wr=class{constructor(e){let t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??Gc,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),t.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),t.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),t.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),t.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=e.allowedNonAlphanumericCharacters?.join("")??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){let t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){let r=this.customStrengthOptions.minPasswordLength,i=this.customStrengthOptions.maxPasswordLength;r&&(t.meetsMinPasswordLength=e.length>=r),i&&(t.meetsMaxPasswordLength=e.length<=i)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let r;for(let i=0;i<e.length;i++)r=e.charAt(i),this.updatePasswordCharacterOptionsStatuses(t,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,t,r,i,s){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=i)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=s))}};var Tr=class{constructor(e,t,r,i){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=r,this.config=i,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new en(this),this.idTokenSubscription=new en(this),this.beforeStateQueue=new Er(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=Os,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=i.sdkClientVersion,this._persistenceManagerAvailable=new Promise(s=>this._resolvePersistenceManagerAvailable=s)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=oe(t)),this._initializationPromise=this.queue(async()=>{if(!this._deleted){try{this.persistenceManager=await ot.create(this,e)}catch(r){Wt(`Failed to initialize persistence: ${r}`),this.persistenceManager=await ot.create(this,[])}finally{this._resolvePersistenceManagerAvailable?.()}if(!this._deleted){if(this._popupRedirectResolver?._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}try{await this.initializeCurrentUser(t)}catch(r){Wt(`Failed to initialize current user: ${r}`),await this.directlySetCurrentUser(null).catch(()=>{})}this.lastNotifiedUid=this.currentUser?.uid||null,!this._deleted&&(this._isInitialized=!0)}}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;let e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{let t=await Xt(this,{idToken:e}),r=await me._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(r)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){if(x(this.app)){let s=this.app.settings.authIdToken;return s?new Promise(o=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(s).then(o,o))}):this.directlySetCurrentUser(null)}let t=await this.assertedPersistence.getCurrentUser(),r=t,i=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();let s=this.redirectUser?._redirectEventId,o=r?._redirectEventId,a=await this.tryRedirectSignIn(e);(!s||s===o)&&a?.user&&(r=a.user,i=!0)}if(!r)return this.directlySetCurrentUser(null);if(!r._redirectEventId){if(i)try{await this.beforeStateQueue.runMiddleware(r)}catch(s){r=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(s))}return r?this.reloadAndSetCurrentUserOrClear(r):this.directlySetCurrentUser(null)}return I(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===r._redirectEventId?this.directlySetCurrentUser(r):this.reloadAndSetCurrentUserOrClear(r)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await lt(e)}catch(t){if(t?.code!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=Lc()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(x(this.app))return Promise.reject(ge(this));let t=e?P(e):null;return t&&I(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&I(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return x(this.app)?Promise.reject(ge(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return x(this.app)?Promise.reject(ge(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(oe(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();let t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){let e=await zc(this),t=new wr(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new re("auth","Firebase",e())}onAuthStateChanged(e,t,r){return this.registerStateListener(this.authStateSubscription,e,t,r)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,r){return this.registerStateListener(this.idTokenSubscription,e,t,r)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{let r=this.onAuthStateChanged(()=>{r(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){let t=await this.currentUser.getIdToken(),r={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(r.tenantId=this.tenantId),await Wc(this,r)}}toJSON(){return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:this._currentUser?.toJSON()}}async _setRedirectUser(e,t){let r=await this.getOrInitRedirectPersistenceManager(t);return e===null?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){let t=e&&oe(e)||this._popupRedirectResolver;I(t,this,"argument-error"),this.redirectPersistenceManager=await ot.create(this,[oe(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){return this._isInitialized&&await this.queue(async()=>{}),this._currentUser?._redirectEventId===e?this._currentUser:this.redirectUser?._redirectEventId===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);let e=this.currentUser?.uid??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,r,i){if(this._deleted)return()=>{};let s=typeof t=="function"?t:t.next.bind(t),o=!1,a=this._isInitialized?Promise.resolve():this._initializationPromise;if(I(a,this,"internal-error"),a.then(()=>{o||s(this.currentUser)}).catch(h=>{if(!o)if(typeof t!="function"&&t.error)t.error(h);else if(r)r(h);else throw h}),typeof t=="function"){let h=e.addObserver(t,r,i);return()=>{o=!0,h()}}else{let h=e.addObserver(t);return()=>{o=!0,h()}}}async directlySetCurrentUser(e){if(this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,this.persistenceManager)try{e?await this.persistenceManager.setCurrentUser(e):await this.persistenceManager.removeCurrentUser()}catch(t){let r=t?.message||String(t),i=yn(this,"internal-error",`An internal AuthError has occurred: ${r}`);throw i.customData={originalError:t},i}}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return I(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=Ks(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){let e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);let t=await this.heartbeatServiceProvider.getImmediate({optional:!0})?.getHeartbeatsHeader();t&&(e["X-Firebase-Client"]=t);let r=await this._getAppCheckToken();return r&&(e["X-Firebase-AppCheck"]=r),e}async _getAppCheckToken(){if(x(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;let e=await this.appCheckServiceProvider.getImmediate({optional:!0})?.getToken();return e?.error&&Wt(`Error while retrieving App Check token: ${e.error}`),e?.token}};function ee(n){return P(n)}var en=class{constructor(e){this.auth=e,this.observer=null,this.addObserver=Yi(t=>this.observer=t)}get next(){return I(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}};var In={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function Kc(n){In=n}function Js(n){return In.loadJS(n)}function Jc(){return In.recaptchaEnterpriseScript}function Yc(){return In.gapiScript}function Ys(n){return`__${n}${Math.floor(Math.random()*1e6)}`}var vr=class{constructor(){this.enterprise=new Ar}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}},Ar=class{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}};var Qc="recaptcha-enterprise",at="NO_RECAPTCHA",_s="onFirebaseAuthREInstanceReady",ht=class n{constructor(e){this.type=Qc,this.auth=ee(e)}async verify(e="verify",t=!1){async function r(s){if(!t){if(s.tenantId==null&&s._agentRecaptchaConfig!=null)return s._agentRecaptchaConfig.siteKey;if(s.tenantId!=null&&s._tenantRecaptchaConfigs[s.tenantId]!==void 0)return s._tenantRecaptchaConfigs[s.tenantId].siteKey}return new Promise(async(o,a)=>{Ms(s,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(h=>{if(h.recaptchaKey===void 0)a(new Error("recaptcha Enterprise site key undefined"));else{let m=new Qt(h);return s.tenantId==null?s._agentRecaptchaConfig=m:s._tenantRecaptchaConfigs[s.tenantId]=m,o(m.siteKey)}}).catch(h=>{a(h)})})}function i(s,o,a){let h=window.grecaptcha;fs(h)?h.enterprise.ready(()=>{h.enterprise.execute(s,{action:e}).then(m=>{o(m)}).catch(()=>{o(at)})}):a(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new vr().execute("siteKey",{action:"verify"}):new Promise((s,o)=>{r(this.auth).then(async a=>{if(!t&&fs(window.grecaptcha)&&n.scriptInjectionDeferred)await n.scriptInjectionDeferred.promise,i(a,s,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let h=Jc();h.length!==0&&(h+=a+`&onload=${_s}`),n.scriptInjectionDeferred=new Ve,window[_s]=()=>{n.scriptInjectionDeferred?.resolve()},Js(h).then(()=>n.scriptInjectionDeferred?.promise).then(()=>{i(a,s,o)}).catch(m=>{o(m)})}}).catch(a=>{o(a)})})}};ht.scriptInjectionDeferred=null;async function nt(n,e,t,r=!1,i=!1){let s=new ht(n),o;if(i)o=at;else try{o=await s.verify(t)}catch{o=await s.verify(t,!0)}let a={...e};if(t==="mfaSmsEnrollment"||t==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in a){let h=a.phoneEnrollmentInfo.phoneNumber,m=a.phoneEnrollmentInfo.recaptchaToken;Object.assign(a,{phoneEnrollmentInfo:{phoneNumber:h,recaptchaToken:m,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in a){let h=a.phoneSignInInfo.recaptchaToken;Object.assign(a,{phoneSignInInfo:{recaptchaToken:h,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return a}return r?Object.assign(a,{captchaResp:o}):Object.assign(a,{captchaResponse:o}),Object.assign(a,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(a,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),a}async function xe(n,e,t,r,i){if(i==="EMAIL_PASSWORD_PROVIDER")if(n._getRecaptchaConfig()?.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){let s=await nt(n,e,t,t==="getOobCode");return r(n,s)}else return r(n,e).catch(async s=>{if(s.code==="auth/missing-recaptcha-token"){console.log(`${t} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);let o=await nt(n,e,t,t==="getOobCode");return r(n,o)}else return Promise.reject(s)});else if(i==="PHONE_PROVIDER")if(n._getRecaptchaConfig()?.isProviderEnabled("PHONE_PROVIDER")){let s=await nt(n,e,t);return r(n,s).catch(async o=>{if(n._getRecaptchaConfig()?.getProviderEnforcementState("PHONE_PROVIDER")==="AUDIT"&&(o.code==="auth/missing-recaptcha-token"||o.code==="auth/invalid-app-credential")){console.log(`Failed to verify with reCAPTCHA Enterprise. Automatically triggering the reCAPTCHA v2 flow to complete the ${t} flow.`);let a=await nt(n,e,t,!1,!0);return r(n,a)}return Promise.reject(o)})}else{let s=await nt(n,e,t,!1,!0);return r(n,s)}else return Promise.reject(i+" provider is not supported.")}async function Xc(n){let e=ee(n),t=await Ms(e,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}),r=new Qt(t);e.tenantId==null?e._agentRecaptchaConfig=r:e._tenantRecaptchaConfigs[e.tenantId]=r,r.isAnyProviderEnabled()&&new ht(e).verify()}function Qs(n,e){let t=tt(n,"auth");if(t.isInitialized()){let i=t.getImmediate(),s=t.getOptions();if(G(s,e??{}))return i;H(i,"already-initialized")}return t.initialize({options:e})}function Zc(n,e){let t=e?.persistence||[],r=(Array.isArray(t)?t:[t]).map(oe);e?.errorMap&&n._updateErrorMap(e.errorMap),n._initializeWithPersistence(r,e?.popupRedirectResolver)}function Ur(n,e,t){let r=ee(n);I(/^https?:\/\//.test(e),r,"invalid-emulator-scheme");let i=!!t?.disableWarnings,s=Xs(e),{host:o,port:a}=eu(e),h=a===null?"":`:${a}`,m={url:`${s}//${o}${h}/`},y=Object.freeze({host:o,port:a,protocol:s.replace(":",""),options:Object.freeze({disableWarnings:i})});if(!r._canInitEmulator){I(r.config.emulator&&r.emulatorConfig,r,"emulator-config-failed"),I(G(m,r.config.emulator)&&G(y,r.emulatorConfig),r,"emulator-config-failed");return}r.config.emulator=m,r.emulatorConfig=y,r.settings.appVerificationDisabledForTesting=!0,ve(o)?Ut(`${s}//${o}${h}`):i||tu()}function Xs(n){let e=n.indexOf(":");return e<0?"":n.substr(0,e+1)}function eu(n){let e=Xs(n),t=/(\/\/)?([^?#/]+)/.exec(n.substr(e.length));if(!t)return{host:"",port:null};let r=t[2].split("@").pop()||"",i=/^(\[[^\]]+\])(:|$)/.exec(r);if(i){let s=i[1];return{host:s,port:ys(r.substr(s.length+1))}}else{let[s,o]=r.split(":");return{host:s,port:ys(o)}}}function ys(n){if(!n)return null;let e=Number(n);return isNaN(e)?null:e}function tu(){function n(){let e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",n):n())}var Se=class{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return X("not implemented")}_getIdTokenResponse(e){return X("not implemented")}_linkToIdToken(e,t){return X("not implemented")}_getReauthenticationResolver(e){return X("not implemented")}};async function nu(n,e){return O(n,"POST","/v1/accounts:signUp",e)}async function ru(n,e){return ke(n,"POST","/v1/accounts:signInWithPassword",k(n,e))}async function iu(n,e){return O(n,"POST","/v1/accounts:sendOobCode",k(n,e))}async function su(n,e){return iu(n,e)}async function ou(n,e){return ke(n,"POST","/v1/accounts:signInWithEmailLink",k(n,e))}async function au(n,e){return ke(n,"POST","/v1/accounts:signInWithEmailLink",k(n,e))}var dt=class n extends Se{constructor(e,t,r,i=null){super("password",r),this._email=e,this._password=t,this._tenantId=i}static _fromEmailAndPassword(e,t){return new n(e,t,"password")}static _fromEmailAndCode(e,t,r=null){return new n(e,t,"emailLink",r)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){let t=typeof e=="string"?JSON.parse(e):e;if(t?.email&&t?.password){if(t.signInMethod==="password")return this._fromEmailAndPassword(t.email,t.password);if(t.signInMethod==="emailLink")return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":let t={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return xe(e,t,"signInWithPassword",ru,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return ou(e,{email:this._email,oobCode:this._password});default:H(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":let r={idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return xe(e,r,"signUpPassword",nu,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return au(e,{idToken:t,email:this._email,oobCode:this._password});default:H(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}};async function qe(n,e){return ke(n,"POST","/v1/accounts:signInWithIdp",k(n,e))}var cu="http://localhost",Re=class n extends Se{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){let t=new n(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):H("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){let t=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:i,...s}=t;if(!r||!i)return null;let o=new n(r,i);return o.idToken=s.idToken||void 0,o.accessToken=s.accessToken||void 0,o.secret=s.secret,o.nonce=s.nonce,o.pendingToken=s.pendingToken||null,o}_getIdTokenResponse(e){let t=this.buildRequest();return qe(e,t)}_linkToIdToken(e,t){let r=this.buildRequest();return r.idToken=t,qe(e,r)}_getReauthenticationResolver(e){let t=this.buildRequest();return t.autoCreate=!1,qe(e,t)}buildRequest(){let e={requestUri:cu,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{let t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=Me(t)}return e}};async function Is(n,e){return O(n,"POST","/v1/accounts:sendVerificationCode",k(n,e))}async function uu(n,e){return ke(n,"POST","/v1/accounts:signInWithPhoneNumber",k(n,e))}async function lu(n,e){let t=await ke(n,"POST","/v1/accounts:signInWithPhoneNumber",k(n,e));if(t.temporaryProof)throw rt(n,"account-exists-with-different-credential",t);return t}var hu={USER_NOT_FOUND:"user-not-found"};async function du(n,e){let t={...e,operation:"REAUTH"};return ke(n,"POST","/v1/accounts:signInWithPhoneNumber",k(n,t),hu)}var ft=class n extends Se{constructor(e){super("phone","phone"),this.params=e}static _fromVerification(e,t){return new n({verificationId:e,verificationCode:t})}static _fromTokenResponse(e,t){return new n({phoneNumber:e,temporaryProof:t})}_getIdTokenResponse(e){return uu(e,this._makeVerificationRequest())}_linkToIdToken(e,t){return lu(e,{idToken:t,...this._makeVerificationRequest()})}_getReauthenticationResolver(e){return du(e,this._makeVerificationRequest())}_makeVerificationRequest(){let{temporaryProof:e,phoneNumber:t,verificationId:r,verificationCode:i}=this.params;return e&&t?{temporaryProof:e,phoneNumber:t}:{sessionInfo:r,code:i}}toJSON(){let e={providerId:this.providerId};return this.params.phoneNumber&&(e.phoneNumber=this.params.phoneNumber),this.params.temporaryProof&&(e.temporaryProof=this.params.temporaryProof),this.params.verificationCode&&(e.verificationCode=this.params.verificationCode),this.params.verificationId&&(e.verificationId=this.params.verificationId),e}static fromJSON(e){typeof e=="string"&&(e=JSON.parse(e));let{verificationId:t,verificationCode:r,phoneNumber:i,temporaryProof:s}=e;return!r&&!t&&!i&&!s?null:new n({verificationId:t,verificationCode:r,phoneNumber:i,temporaryProof:s})}};function fu(n){switch(n){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function pu(n){let e=Ue(Fe(n)).link,t=e?Ue(Fe(e)).deep_link_id:null,r=Ue(Fe(n)).deep_link_id;return(r?Ue(Fe(r)).link:null)||r||t||e||n}var tn=class n{constructor(e){let t=Ue(Fe(e)),r=t.apiKey??null,i=t.oobCode??null,s=fu(t.mode??null);I(r&&i&&s,"argument-error"),this.apiKey=r,this.operation=s,this.code=i,this.continueUrl=t.continueUrl??null,this.languageCode=t.lang??null,this.tenantId=t.tenantId??null}static parseLink(e){let t=pu(e);try{return new n(t)}catch{return null}}};var _e=class n{constructor(){this.providerId=n.PROVIDER_ID}static credential(e,t){return dt._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){let r=tn.parseLink(t);return I(r,"argument-error"),dt._fromEmailAndCode(e,r.code,r.tenantId)}};_e.PROVIDER_ID="password";_e.EMAIL_PASSWORD_SIGN_IN_METHOD="password";_e.EMAIL_LINK_SIGN_IN_METHOD="emailLink";var pt=class{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}};var Pe=class extends pt{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}};var mt=class n extends Pe{constructor(){super("facebook.com")}static credential(e){return Re._fromParams({providerId:n.PROVIDER_ID,signInMethod:n.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return n.credentialFromTaggedObject(e)}static credentialFromError(e){return n.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return n.credential(e.oauthAccessToken)}catch{return null}}};mt.FACEBOOK_SIGN_IN_METHOD="facebook.com";mt.PROVIDER_ID="facebook.com";var $e=class n extends Pe{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return Re._fromParams({providerId:n.PROVIDER_ID,signInMethod:n.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return n.credentialFromTaggedObject(e)}static credentialFromError(e){return n.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;let{oauthIdToken:t,oauthAccessToken:r}=e;if(!t&&!r)return null;try{return n.credential(t,r)}catch{return null}}};$e.GOOGLE_SIGN_IN_METHOD="google.com";$e.PROVIDER_ID="google.com";var gt=class n extends Pe{constructor(){super("github.com")}static credential(e){return Re._fromParams({providerId:n.PROVIDER_ID,signInMethod:n.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return n.credentialFromTaggedObject(e)}static credentialFromError(e){return n.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return n.credential(e.oauthAccessToken)}catch{return null}}};gt.GITHUB_SIGN_IN_METHOD="github.com";gt.PROVIDER_ID="github.com";var _t=class n extends Pe{constructor(){super("twitter.com")}static credential(e,t){return Re._fromParams({providerId:n.PROVIDER_ID,signInMethod:n.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return n.credentialFromTaggedObject(e)}static credentialFromError(e){return n.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;let{oauthAccessToken:t,oauthTokenSecret:r}=e;if(!t||!r)return null;try{return n.credential(t,r)}catch{return null}}};_t.TWITTER_SIGN_IN_METHOD="twitter.com";_t.PROVIDER_ID="twitter.com";var yt=class n{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,r,i=!1){let s=await me._fromIdTokenResponse(e,r,i),o=Es(r);return new n({user:s,providerId:o,_tokenResponse:r,operationType:t})}static async _forOperation(e,t,r){await e._updateTokensIfNecessary(r,!0);let i=Es(r);return new n({user:e,providerId:i,_tokenResponse:r,operationType:t})}};function Es(n){return n.providerId?n.providerId:"phoneNumber"in n?"phone":null}var br=class n extends ${constructor(e,t,r,i){super(t.code,t.message),this.operationType=r,this.user=i,Object.setPrototypeOf(this,n.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,t,r,i){return new n(e,t,r,i)}};function Zs(n,e,t,r){return(e==="reauthenticate"?t._getReauthenticationResolver(n):t._getIdTokenResponse(n)).catch(s=>{throw s.code==="auth/multi-factor-auth-required"?br._fromErrorAndOperation(n,s,e,r):s})}function mu(n){return new Set(n.map(({providerId:e})=>e).filter(e=>!!e))}async function eo(n,e,t=!1){let r=await ct(n,e._linkToIdToken(n.auth,await n.getIdToken()),t);return yt._forOperation(n,"link",r)}async function gu(n,e,t){await lt(e);let r=mu(e.providerData),i=n===!1?"provider-already-linked":"no-such-provider";I(r.has(t)===n,e.auth,i)}async function _u(n,e,t=!1){let{auth:r}=n;if(x(r.app))return Promise.reject(ge(r));let i="reauthenticate";try{let s=await ct(n,Zs(r,i,e,n),t);I(s.idToken,r,"internal-error");let o=Vr(s.idToken);I(o,r,"internal-error");let{sub:a}=o;return I(n.uid===a,r,"user-mismatch"),yt._forOperation(n,i,s)}catch(s){throw s?.code==="auth/user-not-found"&&H(r,"user-mismatch"),s}}async function to(n,e,t=!1){if(x(n.app))return Promise.reject(ge(n));let r="signIn",i=await Zs(n,r,e),s=await yt._fromIdTokenResponse(n,r,i);return t||await n._updateCurrentUser(s.user),s}async function no(n,e){return to(ee(n),e)}async function ro(n,e){let t=P(n);return await gu(!1,t,e.providerId),eo(t,e)}function yu(n,e,t){I(t.url?.length>0,n,"invalid-continue-uri"),I(typeof t.dynamicLinkDomain>"u"||t.dynamicLinkDomain.length>0,n,"invalid-dynamic-link-domain"),I(typeof t.linkDomain>"u"||t.linkDomain.length>0,n,"invalid-hosting-link-domain"),e.continueUrl=t.url,e.dynamicLinkDomain=t.dynamicLinkDomain,e.linkDomain=t.linkDomain,e.canHandleCodeInApp=t.handleCodeInApp,t.iOS&&(I(t.iOS.bundleId.length>0,n,"missing-ios-bundle-id"),e.iOSBundleId=t.iOS.bundleId),t.android&&(I(t.android.packageName.length>0,n,"missing-android-pkg-name"),e.androidInstallApp=t.android.installApp,e.androidMinimumVersionCode=t.android.minimumVersion,e.androidPackageName=t.android.packageName)}async function Iu(n){let e=ee(n);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}async function io(n,e,t){let r=ee(n),i={requestType:"PASSWORD_RESET",email:e,clientType:"CLIENT_TYPE_WEB"};t&&yu(r,i,t),await xe(r,i,"getOobCode",su,"EMAIL_PASSWORD_PROVIDER")}function so(n,e,t){return x(n.app)?Promise.reject(ge(n)):no(P(n),_e.credential(e,t)).catch(async r=>{throw r.code==="auth/password-does-not-meet-requirements"&&Iu(n),r})}function oo(n,e,t,r){return P(n).onIdTokenChanged(e,t,r)}function ao(n,e,t){return P(n).beforeAuthStateChanged(e,t)}function co(n,e,t,r){return P(n).onAuthStateChanged(e,t,r)}function uo(n){return P(n).signOut()}function ws(n,e){return O(n,"POST","/v2/accounts/mfaEnrollment:start",k(n,e))}function Eu(n,e){return O(n,"POST","/v2/accounts/mfaEnrollment:finalize",k(n,e))}function wu(n,e){return O(n,"POST","/v2/accounts/mfaEnrollment:start",k(n,e))}function Tu(n,e){return O(n,"POST","/v2/accounts/mfaEnrollment:finalize",k(n,e))}var nn="__sak";var rn=class{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(nn,"1"),this.storage.removeItem(nn),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){let t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}};var vu=1e3,Au=10,sn=class extends rn{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=Gs(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(let t of Object.keys(this.listeners)){let r=this.storage.getItem(t),i=this.localCache[t];r!==i&&e(t,i,r)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((o,a,h)=>{this.notifyListeners(o,h)});return}let r=e.key;t?this.detachListener():this.stopPolling();let i=()=>{let o=this.storage.getItem(r);!t&&this.localCache[r]===o||this.notifyListeners(r,o)},s=this.storage.getItem(r);jc()&&s!==e.newValue&&e.newValue!==e.oldValue?setTimeout(i,Au):i()}notifyListeners(e,t){this.localCache[e]=t;let r=this.listeners[e];if(r)for(let i of Array.from(r))i(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,r)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:r}),!0)})},vu)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){let t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}};sn.type="LOCAL";var lo=sn;var bu=1e3;function dr(n){let e=n.replace(/[\\^$.*+?()[\]{}|]/g,"\\$&"),t=RegExp(`${e}=([^;]+)`);return document.cookie.match(t)?.[1]??null}function fr(n){return`${window.location.protocol==="http:"?"__dev_":"__HOST-"}FIREBASE_${n.split(":")[3]}`}var Sr=class{constructor(){this.type="COOKIE",this.listenerUnsubscribes=new Map}_getFinalTarget(e){if(typeof window===void 0)return e;let t=new URL(`${window.location.origin}/__cookies__`);return t.searchParams.set("finalTarget",e),t}async _isAvailable(){return typeof isSecureContext=="boolean"&&!isSecureContext||typeof navigator>"u"||typeof document>"u"?!1:navigator.cookieEnabled??!0}async _set(e,t){}async _get(e){if(!this._isAvailable())return null;let t=fr(e);return window.cookieStore?(await window.cookieStore.get(t))?.value:dr(t)}async _remove(e){if(!this._isAvailable()||!await this._get(e))return;let r=fr(e);document.cookie=`${r}=;Max-Age=34560000;Partitioned;Secure;SameSite=Strict;Path=/;Priority=High`,await fetch("/__cookies__",{method:"DELETE"}).catch(()=>{})}_addListener(e,t){if(!this._isAvailable())return;let r=fr(e);if(window.cookieStore){let a=m=>{let y=m.changed.find(T=>T.name===r);y&&t(y.value),m.deleted.find(T=>T.name===r)&&t(null)},h=()=>window.cookieStore.removeEventListener("change",a);return this.listenerUnsubscribes.set(t,h),window.cookieStore.addEventListener("change",a)}let i=dr(r),s=setInterval(()=>{let a=dr(r);a!==i&&(t(a),i=a)},bu),o=()=>clearInterval(s);this.listenerUnsubscribes.set(t,o)}_removeListener(e,t){let r=this.listenerUnsubscribes.get(t);r&&(r(),this.listenerUnsubscribes.delete(t))}};Sr.type="COOKIE";var on=class extends rn{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}};on.type="SESSION";var Fr=on;function Su(n){return Promise.all(n.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}var an=class n{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){let t=this.receivers.find(i=>i.isListeningto(e));if(t)return t;let r=new n(e);return this.receivers.push(r),r}isListeningto(e){return this.eventTarget===e}async handleEvent(e){let t=e,{eventId:r,eventType:i,data:s}=t.data,o=this.handlersMap[i];if(!o?.size)return;t.ports[0].postMessage({status:"ack",eventId:r,eventType:i});let a=Array.from(o).map(async m=>m(t.origin,s)),h=await Su(a);t.ports[0].postMessage({status:"done",eventId:r,eventType:i,response:h})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}};an.receivers=[];function xr(n="",e=10){let t="";for(let r=0;r<e;r++)t+=Math.floor(Math.random()*10);return n+t}var Rr=class{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,r=50){let i=typeof MessageChannel<"u"?new MessageChannel:null;if(!i)throw new Error("connection_unavailable");let s,o;return new Promise((a,h)=>{let m=xr("",20);i.port1.start();let y=setTimeout(()=>{h(new Error("unsupported_event"))},r);o={messageChannel:i,onMessage(E){let T=E;if(T.data.eventId===m)switch(T.data.status){case"ack":clearTimeout(y),s=setTimeout(()=>{h(new Error("timeout"))},3e3);break;case"done":clearTimeout(s),a(T.data.response);break;default:clearTimeout(y),clearTimeout(s),h(new Error("invalid_response"));break}}},this.handlers.add(o),i.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:m,data:t},[i.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}};function Z(){return window}function Ru(n){Z().location.href=n}function ho(){return typeof Z().WorkerGlobalScope<"u"&&typeof Z().importScripts=="function"}async function Pu(){if(!navigator?.serviceWorker)return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function Nu(){return navigator?.serviceWorker?.controller||null}function ku(){return ho()?self:null}var fo="firebaseLocalStorageDb",Cu=1,cn="firebaseLocalStorage",po="fbase_key",Ne=class{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}};function En(n,e){return n.transaction([cn],e?"readwrite":"readonly").objectStore(cn)}function Du(){let n=indexedDB.deleteDatabase(fo);return new Ne(n).toPromise()}function mo(){let n=indexedDB.open(fo,Cu);return new Promise((e,t)=>{n.addEventListener("error",()=>{t(n.error)}),n.addEventListener("upgradeneeded",()=>{let r=n.result;try{r.createObjectStore(cn,{keyPath:po})}catch(i){t(i)}}),n.addEventListener("success",async()=>{let r=n.result;r.objectStoreNames.contains(cn)?e(r):(r.close(),await Du(),e(await mo()))})})}async function Ts(n,e,t){let r=En(n,!0).put({[po]:e,value:t});return new Ne(r).toPromise()}async function Ou(n,e){let t=En(n,!1).get(e),r=await new Ne(t).toPromise();return r===void 0?null:r.value}function vs(n,e){let t=En(n,!0).delete(e);return new Ne(t).toPromise()}var Lu=800,Vu=3,un=class{registerLifecycleListeners(){typeof window<"u"&&typeof window.addEventListener=="function"&&(window.addEventListener("pagehide",this.onPageHide),window.addEventListener("pageshow",this.onPageShow))}unregisterLifecycleListeners(){typeof window<"u"&&typeof window.removeEventListener=="function"&&(window.removeEventListener("pagehide",this.onPageHide),window.removeEventListener("pageshow",this.onPageShow))}constructor(){this.type="LOCAL",this.dbPromise=null,this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.isClosing=!1,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this.onPageHide=()=>{this.isClosing=!0,this.stopPolling(),this.dbPromise&&(this.dbPromise.then(e=>e.close()).catch(()=>{}),this.dbPromise=null)},this.onPageShow=()=>{this.isClosing&&(this.isClosing=!1,Object.keys(this.listeners).length>0&&this.startPolling())},this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.dbPromise?this.dbPromise:(this.dbPromise=mo(),this.dbPromise.catch(()=>{this.dbPromise=null}),this.dbPromise)}async _withRetries(e){let t=0;for(;;)try{let r=await this._openDb();return await e(r)}catch(r){if(t++>Vu)throw r;if(this.dbPromise){let i=this.dbPromise;this.dbPromise=null;try{(await i).close()}catch{}}}}async initializeServiceWorkerMessaging(){return ho()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=an._getInstance(ku()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){if(this.activeServiceWorker=await Pu(),!this.activeServiceWorker)return;this.sender=new Rr(this.activeServiceWorker);let e=await this.sender._send("ping",{},800);e&&e[0]?.fulfilled&&e[0]?.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||Nu()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{return indexedDB?(await this._withRetries(async e=>{await Ts(e,nn,"1"),await vs(e,nn)}),!0):!1}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(r=>Ts(r,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){let t=await this._withRetries(r=>Ou(r,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>vs(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){if(this.isClosing)return[];try{let e=await this._withRetries(i=>{let s=En(i,!1).getAll();return new Ne(s).toPromise()});if(this.isClosing)return[];if(!e)return[];if(this.pendingWrites!==0)return[];let t=[],r=new Set;if(e.length!==0)for(let{fbase_key:i,value:s}of e)r.add(i),JSON.stringify(this.localCache[i])!==JSON.stringify(s)&&(this.notifyListeners(i,s),t.push(i));for(let i of Object.keys(this.localCache))this.localCache[i]&&!r.has(i)&&(this.notifyListeners(i,null),t.push(i));return t}catch(e){return this.isClosing||Wt(`Firebase Auth cross-tab polling failed with error: ${e}`),[]}}notifyListeners(e,t){this.localCache[e]=t;let r=this.listeners[e];if(r)for(let i of Array.from(r))i(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),Lu)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.startPolling(),this.registerLifecycleListeners()),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.stopPolling(),this.unregisterLifecycleListeners())}};un.type="LOCAL";var go=un;function As(n,e){return O(n,"POST","/v2/accounts/mfaSignIn:start",k(n,e))}function Mu(n,e){return O(n,"POST","/v2/accounts/mfaSignIn:finalize",k(n,e))}function Uu(n,e){return O(n,"POST","/v2/accounts/mfaSignIn:finalize",k(n,e))}var Sh=Ys("rcb"),Rh=new be(3e4,6e4);var zt="recaptcha";async function Fu(n,e,t){if(!n._getRecaptchaConfig())try{await Xc(n)}catch{console.log("Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification.")}try{let r;if(typeof e=="string"?r={phoneNumber:e}:r=e,"session"in r){let i=r.session;if("phoneNumber"in r){I(i.type==="enroll",n,"internal-error");let s={idToken:i.credential,phoneEnrollmentInfo:{phoneNumber:r.phoneNumber,clientType:"CLIENT_TYPE_WEB"}};return(await xe(n,s,"mfaSmsEnrollment",async(m,y)=>{if(y.phoneEnrollmentInfo.captchaResponse===at){I(t?.type===zt,m,"argument-error");let E=await pr(m,y,t);return ws(m,E)}return ws(m,y)},"PHONE_PROVIDER").catch(m=>Promise.reject(m))).phoneSessionInfo.sessionInfo}else{I(i.type==="signin",n,"internal-error");let s=r.multiFactorHint?.uid||r.multiFactorUid;I(s,n,"missing-multi-factor-info");let o={mfaPendingCredential:i.credential,mfaEnrollmentId:s,phoneSignInInfo:{clientType:"CLIENT_TYPE_WEB"}};return(await xe(n,o,"mfaSmsSignIn",async(y,E)=>{if(E.phoneSignInInfo.captchaResponse===at){I(t?.type===zt,y,"argument-error");let T=await pr(y,E,t);return As(y,T)}return As(y,E)},"PHONE_PROVIDER").catch(y=>Promise.reject(y))).phoneResponseInfo.sessionInfo}}else{let i={phoneNumber:r.phoneNumber,clientType:"CLIENT_TYPE_WEB"};return(await xe(n,i,"sendVerificationCode",async(h,m)=>{if(m.captchaResponse===at){I(t?.type===zt,h,"argument-error");let y=await pr(h,m,t);return Is(h,y)}return Is(h,m)},"PHONE_PROVIDER").catch(h=>Promise.reject(h))).sessionInfo}}finally{t?._reset()}}async function pr(n,e,t){I(t.type===zt,n,"argument-error");let r=await t.verify();I(typeof r=="string",n,"argument-error");let i={...e};if("phoneEnrollmentInfo"in i){let s=i.phoneEnrollmentInfo.phoneNumber,o=i.phoneEnrollmentInfo.captchaResponse,a=i.phoneEnrollmentInfo.clientType,h=i.phoneEnrollmentInfo.recaptchaVersion;return Object.assign(i,{phoneEnrollmentInfo:{phoneNumber:s,recaptchaToken:r,captchaResponse:o,clientType:a,recaptchaVersion:h}}),i}else if("phoneSignInInfo"in i){let s=i.phoneSignInInfo.captchaResponse,o=i.phoneSignInInfo.clientType,a=i.phoneSignInInfo.recaptchaVersion;return Object.assign(i,{phoneSignInInfo:{recaptchaToken:r,captchaResponse:s,clientType:o,recaptchaVersion:a}}),i}else return Object.assign(i,{recaptchaToken:r}),i}var It=class n{constructor(e){this.providerId=n.PROVIDER_ID,this.auth=ee(e)}verifyPhoneNumber(e,t){return Fu(this.auth,e,P(t))}static credential(e,t){return ft._fromVerification(e,t)}static credentialFromResult(e){let t=e;return n.credentialFromTaggedObject(t)}static credentialFromError(e){return n.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;let{phoneNumber:t,temporaryProof:r}=e;return t&&r?ft._fromTokenResponse(t,r):null}};It.PROVIDER_ID="phone";It.PHONE_SIGN_IN_METHOD="phone";function _o(n,e){return e?oe(e):(I(n._popupRedirectResolver,n,"argument-error"),n._popupRedirectResolver)}var Et=class extends Se{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return qe(e,this._buildIdpRequest())}_linkToIdToken(e,t){return qe(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return qe(e,this._buildIdpRequest())}_buildIdpRequest(e){let t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}};function xu(n){return to(n.auth,new Et(n),n.bypassAuthState)}function qu(n){let{auth:e,user:t}=n;return I(t,e,"internal-error"),_u(t,new Et(n),n.bypassAuthState)}async function $u(n){let{auth:e,user:t}=n;return I(t,e,"internal-error"),eo(t,new Et(n),n.bypassAuthState)}var ln=class{constructor(e,t,r,i,s=!1){this.auth=e,this.resolver=r,this.user=i,this.bypassAuthState=s,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(r){this.reject(r)}})}async onAuthEvent(e){let{urlResponse:t,sessionId:r,postBody:i,tenantId:s,error:o,type:a}=e;if(o){this.reject(o);return}let h={auth:this.auth,requestUri:t,sessionId:r,tenantId:s||void 0,postBody:i||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(a)(h))}catch(m){this.reject(m)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return xu;case"linkViaPopup":case"linkViaRedirect":return $u;case"reauthViaPopup":case"reauthViaRedirect":return qu;default:H(this.auth,"internal-error")}}resolve(e){ae(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){ae(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}};var Bu=new be(2e3,1e4);async function yo(n,e,t){if(x(n.app))return Promise.reject(J(n,"operation-not-supported-in-this-environment"));let r=ee(n);Cc(n,e,pt);let i=_o(r,t);return new hn(r,"signInViaPopup",e,i).executeNotNull()}var hn=class n extends ln{constructor(e,t,r,i,s){super(e,t,i,s),this.provider=r,this.authWindow=null,this.pollId=null,n.currentPopupAction&&n.currentPopupAction.cancel(),n.currentPopupAction=this}async executeNotNull(){let e=await this.execute();return I(e,this.auth,"internal-error"),e}async onExecution(){ae(this.filter.length===1,"Popup operations only handle one event");let e=xr();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(J(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){return this.authWindow?.associatedEvent||null}cancel(){this.reject(J(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,n.currentPopupAction=null}pollUserCancellation(){let e=()=>{if(this.authWindow?.window?.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(J(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,Bu.get())};e()}};hn.currentPopupAction=null;var Wu="pendingRedirect",Gt=new Map,Pr=class extends ln{constructor(e,t,r=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,r),this.eventId=null}async execute(){let e=Gt.get(this.auth._key());if(!e){try{let r=await Hu(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(r)}catch(t){e=()=>Promise.reject(t)}Gt.set(this.auth._key(),e)}return this.bypassAuthState||Gt.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){let t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}};async function Hu(n,e){let t=Gu(e),r=zu(n);if(!await r._isAvailable())return!1;let i=await r._get(t)==="true";return await r._remove(t),i}function ju(n,e){Gt.set(n._key(),e)}function zu(n){return oe(n._redirectPersistence)}function Gu(n){return jt(Wu,n.config.apiKey,n.name)}async function Ku(n,e,t=!1){if(x(n.app))return Promise.reject(ge(n));let r=ee(n),i=_o(r,e),o=await new Pr(r,i,t).execute();return o&&!t&&(delete o.user._redirectEventId,await r._persistUserIfCurrent(o.user),await r._setRedirectUser(null,e)),o}var Ju=10*60*1e3,Nr=class{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(r=>{this.isEventForConsumer(e,r)&&(t=!0,this.sendToConsumer(e,r),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!Yu(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){if(e.error&&!Io(e)){let r=e.error.code?.split("auth/")[1]||"internal-error";t.onError(J(this.auth,r))}else t.onAuthEvent(e)}isEventForConsumer(e,t){let r=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&r}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=Ju&&this.cachedEventUids.clear(),this.cachedEventUids.has(bs(e))}saveEventToCache(e){this.cachedEventUids.add(bs(e)),this.lastProcessedEventTime=Date.now()}};function bs(n){return[n.type,n.eventId,n.sessionId,n.tenantId].filter(e=>e).join("-")}function Io({type:n,error:e}){return n==="unknown"&&e?.code==="auth/no-auth-event"}function Yu(n){switch(n.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return Io(n);default:return!1}}async function Qu(n,e={}){return O(n,"GET","/v1/projects",e)}var Xu=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,Zu=/^https?/;async function el(n){if(n.config.emulator)return;let{authorizedDomains:e}=await Qu(n);for(let t of e)try{if(tl(t))return}catch{}H(n,"unauthorized-domain")}function tl(n){let e=gr(),{protocol:t,hostname:r}=new URL(e);if(n.startsWith("chrome-extension://")){let o=new URL(n);return o.hostname===""&&r===""?t==="chrome-extension:"&&n.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&o.hostname===r}if(!Zu.test(t))return!1;if(Xu.test(n))return r===n;let i=n.replace(/\./g,"\\.");return new RegExp("^(.+\\."+i+"|"+i+")$","i").test(r)}var nl=new be(3e4,6e4);function Ss(){let n=Z().___jsl;if(n?.H){for(let e of Object.keys(n.H))if(n.H[e].r=n.H[e].r||[],n.H[e].L=n.H[e].L||[],n.H[e].r=[...n.H[e].L],n.CP)for(let t=0;t<n.CP.length;t++)n.CP[t]=null}}function rl(n){return new Promise((e,t)=>{function r(){Ss(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{Ss(),t(J(n,"network-request-failed"))},timeout:nl.get()})}if(Z().gapi?.iframes?.Iframe)e(gapi.iframes.getContext());else if(Z().gapi?.load)r();else{let i=Ys("iframefcb");return Z()[i]=()=>{gapi.load?r():t(J(n,"network-request-failed"))},Js(`${Yc()}?onload=${i}`).catch(s=>t(s))}}).catch(e=>{throw Kt=null,e})}var Kt=null;function il(n){return Kt=Kt||rl(n),Kt}var sl=new be(5e3,15e3),ol="__/auth/iframe",al="emulator/auth/iframe",cl={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},ul=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function ll(n){let e=n.config;I(e.authDomain,n,"auth-domain-config-required");let t=e.emulator?Lr(e,al):`https://${n.config.authDomain}/${ol}`,r={apiKey:e.apiKey,appName:n.name,v:fe},i=ul.get(n.config.apiHost);i&&(r.eid=i);let s=n._getFrameworks();return s.length&&(r.fw=s.join(",")),`${t}?${Me(r).slice(1)}`}async function hl(n){let e=await il(n),t=Z().gapi;return I(t,n,"internal-error"),e.open({where:document.body,url:ll(n),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:cl,dontclear:!0},r=>new Promise(async(i,s)=>{await r.restyle({setHideOnLeave:!1});let o=J(n,"network-request-failed"),a=Z().setTimeout(()=>{s(o)},sl.get());function h(){Z().clearTimeout(a),i(r)}r.ping(h).then(h,()=>{s(o)})}))}var dl={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},fl=500,pl=600,ml="_blank",gl="http://localhost",dn=class{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}};function _l(n,e,t,r=fl,i=pl){let s=Math.max((window.screen.availHeight-i)/2,0).toString(),o=Math.max((window.screen.availWidth-r)/2,0).toString(),a="",h={...dl,width:r.toString(),height:i.toString(),top:s,left:o},m=V().toLowerCase();t&&(a=Bs(m)?ml:t),qs(m)&&(e=e||gl,h.scrollbars="yes");let y=Object.entries(h).reduce((T,[N,S])=>`${T}${N}=${S},`,"");if(Hc(m)&&a!=="_self")return yl(e||"",a),new dn(null);let E=window.open(e||"",a,y);I(E,n,"popup-blocked");try{E.focus()}catch{}return new dn(E)}function yl(n,e){let t=document.createElement("a");t.href=n,t.target=e;let r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(r)}var Il="__/auth/handler",El="emulator/auth/handler",wl=encodeURIComponent("fac");async function Rs(n,e,t,r,i,s){I(n.config.authDomain,n,"auth-domain-config-required"),I(n.config.apiKey,n,"invalid-api-key");let o={apiKey:n.config.apiKey,appName:n.name,authType:t,redirectUrl:r,v:fe,eventId:i};if(e instanceof pt){e.setDefaultLanguage(n.languageCode),o.providerId=e.providerId||"",Ji(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(let[y,E]of Object.entries(s||{}))o[y]=E}if(e instanceof Pe){let y=e.getScopes().filter(E=>E!=="");y.length>0&&(o.scopes=y.join(","))}n.tenantId&&(o.tid=n.tenantId);let a=o;for(let y of Object.keys(a))a[y]===void 0&&delete a[y];let h=await n._getAppCheckToken(),m=h?`#${wl}=${encodeURIComponent(h)}`:"";return`${Tl(n)}?${Me(a).slice(1)}${m}`}function Tl({config:n}){return n.emulator?Lr(n,El):`https://${n.authDomain}/${Il}`}var mr="webStorageSupport",kr=class{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=Fr,this._completeRedirectFn=Ku,this._overrideRedirectResult=ju}async _openPopup(e,t,r,i){ae(this.eventManagers[e._key()]?.manager,"_initialize() not called before _openPopup()");let s=await Rs(e,t,r,gr(),i);return _l(e,s,xr())}async _openRedirect(e,t,r,i){await this._originValidation(e);let s=await Rs(e,t,r,gr(),i);return Ru(s),new Promise(()=>{})}_initialize(e){let t=e._key();if(this.eventManagers[t]){let{manager:i,promise:s}=this.eventManagers[t];return i?Promise.resolve(i):(ae(s,"If manager is not set, promise should be"),s)}let r=this.initAndGetManager(e);return this.eventManagers[t]={promise:r},r.catch(()=>{delete this.eventManagers[t]}),r}async initAndGetManager(e){let t=await hl(e),r=new Nr(e);return t.register("authEvent",i=>(I(i?.authEvent,e,"invalid-auth-event"),{status:r.onEvent(i.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:r},this.iframes[e._key()]=t,r}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(mr,{type:mr},i=>{let s=i?.[0]?.[mr];s!==void 0&&t(!!s),H(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){let t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=el(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return Gs()||$s()||Mr()}},Eo=kr,fn=class{constructor(e){this.factorId=e}_process(e,t,r){switch(t.type){case"enroll":return this._finalizeEnroll(e,t.credential,r);case"signin":return this._finalizeSignIn(e,t.credential);default:return X("unexpected MultiFactorSessionType")}}},Cr=class n extends fn{constructor(e){super("phone"),this.credential=e}static _fromCredential(e){return new n(e)}_finalizeEnroll(e,t,r){return Eu(e,{idToken:t,displayName:r,phoneVerificationInfo:this.credential._makeVerificationRequest()})}_finalizeSignIn(e,t){return Mu(e,{mfaPendingCredential:t,phoneVerificationInfo:this.credential._makeVerificationRequest()})}},pn=class{constructor(){}static assertion(e){return Cr._fromCredential(e)}};pn.FACTOR_ID="phone";var mn=class{static assertionForEnrollment(e,t){return gn._fromSecret(e,t)}static assertionForSignIn(e,t){return gn._fromEnrollmentId(e,t)}static async generateSecret(e){let t=e;I(typeof t.user?.auth<"u","internal-error");let r=await wu(t.user.auth,{idToken:t.credential,totpEnrollmentInfo:{}});return _n._fromStartTotpMfaEnrollmentResponse(r,t.user.auth)}};mn.FACTOR_ID="totp";var gn=class n extends fn{constructor(e,t,r){super("totp"),this.otp=e,this.enrollmentId=t,this.secret=r}static _fromSecret(e,t){return new n(t,void 0,e)}static _fromEnrollmentId(e,t){return new n(t,e)}async _finalizeEnroll(e,t,r){return I(typeof this.secret<"u",e,"argument-error"),Tu(e,{idToken:t,displayName:r,totpVerificationInfo:this.secret._makeTotpVerificationInfo(this.otp)})}async _finalizeSignIn(e,t){I(this.enrollmentId!==void 0&&this.otp!==void 0,e,"argument-error");let r={verificationCode:this.otp};return Uu(e,{mfaPendingCredential:t,mfaEnrollmentId:this.enrollmentId,totpVerificationInfo:r})}},_n=class n{constructor(e,t,r,i,s,o,a){this.sessionInfo=o,this.auth=a,this.secretKey=e,this.hashingAlgorithm=t,this.codeLength=r,this.codeIntervalSeconds=i,this.enrollmentCompletionDeadline=s}static _fromStartTotpMfaEnrollmentResponse(e,t){return new n(e.totpSessionInfo.sharedSecretKey,e.totpSessionInfo.hashingAlgorithm,e.totpSessionInfo.verificationCodeLength,e.totpSessionInfo.periodSec,new Date(e.totpSessionInfo.finalizeEnrollmentTime).toUTCString(),e.totpSessionInfo.sessionInfo,t)}_makeTotpVerificationInfo(e){return{sessionInfo:this.sessionInfo,verificationCode:e}}generateQrCodeUrl(e,t){let r=!1;return(Bt(e)||Bt(t))&&(r=!0),r&&(Bt(e)&&(e=this.auth.currentUser?.email||"unknownuser"),Bt(t)&&(t=this.auth.name)),`otpauth://totp/${t}:${e}?secret=${this.secretKey}&issuer=${t}&algorithm=${this.hashingAlgorithm}&digits=${this.codeLength}`}};function Bt(n){return typeof n>"u"||n?.length===0}var Ps="@firebase/auth",Ns="1.13.6";var Dr=class{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){return this.assertAuthConfigured(),this.auth.currentUser?.uid||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;let t=this.auth.onIdTokenChanged(r=>{e(r?.stsTokenManager.accessToken||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();let t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){I(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}};function vl(n){switch(n){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function Al(n){de(new W("auth",(e,{options:t})=>{let r=e.getProvider("app").getImmediate(),i=e.getProvider("heartbeat"),s=e.getProvider("app-check-internal"),{apiKey:o,authDomain:a}=r.options;I(o&&!o.includes(":"),"invalid-api-key",{appName:r.name});let h={apiKey:o,authDomain:a,clientPlatform:n,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:Ks(n)},m=new Tr(r,i,s,h);return Zc(m,t),m},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,r)=>{e.getProvider("auth-internal").initialize()})),de(new W("auth-internal",e=>{let t=ee(e.getProvider("auth").getImmediate());return(r=>new Dr(r))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),K(Ps,Ns,vl(n)),K(Ps,Ns,"esm2020")}var bl=5*60,Sl=Yn("authIdTokenMaxAge")||bl,ks=null,Rl=n=>async e=>{let t=e&&await e.getIdTokenResult(),r=t&&(new Date().getTime()-Date.parse(t.issuedAtTime))/1e3;if(r&&r>Sl)return;let i=t?.token;ks!==i&&(ks=i,await fetch(n,{method:i?"POST":"DELETE",headers:i?{Authorization:`Bearer ${i}`}:{}}))};function wo(n=$t()){let e=tt(n,"auth");if(e.isInitialized())return e.getImmediate();let t=Qs(n,{popupRedirectResolver:Eo,persistence:[go,lo,Fr]}),r=Yn("authTokenSyncURL");if(r&&typeof isSecureContext=="boolean"&&isSecureContext){let s=new URL(r,location.origin);if(location.origin===s.origin){let o=Rl(s.toString());ao(t,o,()=>o(t.currentUser)),oo(t,a=>o(a))}}let i=Kn("auth");return i&&Ur(t,`http://${i}`),t}function Pl(){return document.getElementsByTagName("head")?.[0]??document}Kc({loadJS(n){return new Promise((e,t)=>{let r=document.createElement("script");r.setAttribute("src",n),r.onload=e,r.onerror=i=>{let s=J("internal-error");s.customData=i,t(s)},r.type="text/javascript",r.charset="UTF-8",Pl().appendChild(r)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});Al("Browser");var To=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{},vo={};var qr,Nl;(function(){var n;function e(d,c){function l(){}l.prototype=c.prototype,d.F=c.prototype,d.prototype=new l,d.prototype.constructor=d,d.D=function(p,f,g){for(var u=Array(arguments.length-2),Te=2;Te<arguments.length;Te++)u[Te-2]=arguments[Te];return c.prototype[f].apply(p,u)}}function t(){this.blockSize=-1}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(r,t),r.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function i(d,c,l){l||(l=0);let p=Array(16);if(typeof c=="string")for(var f=0;f<16;++f)p[f]=c.charCodeAt(l++)|c.charCodeAt(l++)<<8|c.charCodeAt(l++)<<16|c.charCodeAt(l++)<<24;else for(f=0;f<16;++f)p[f]=c[l++]|c[l++]<<8|c[l++]<<16|c[l++]<<24;c=d.g[0],l=d.g[1],f=d.g[2];let g=d.g[3],u;u=c+(g^l&(f^g))+p[0]+3614090360&4294967295,c=l+(u<<7&4294967295|u>>>25),u=g+(f^c&(l^f))+p[1]+3905402710&4294967295,g=c+(u<<12&4294967295|u>>>20),u=f+(l^g&(c^l))+p[2]+606105819&4294967295,f=g+(u<<17&4294967295|u>>>15),u=l+(c^f&(g^c))+p[3]+3250441966&4294967295,l=f+(u<<22&4294967295|u>>>10),u=c+(g^l&(f^g))+p[4]+4118548399&4294967295,c=l+(u<<7&4294967295|u>>>25),u=g+(f^c&(l^f))+p[5]+1200080426&4294967295,g=c+(u<<12&4294967295|u>>>20),u=f+(l^g&(c^l))+p[6]+2821735955&4294967295,f=g+(u<<17&4294967295|u>>>15),u=l+(c^f&(g^c))+p[7]+4249261313&4294967295,l=f+(u<<22&4294967295|u>>>10),u=c+(g^l&(f^g))+p[8]+1770035416&4294967295,c=l+(u<<7&4294967295|u>>>25),u=g+(f^c&(l^f))+p[9]+2336552879&4294967295,g=c+(u<<12&4294967295|u>>>20),u=f+(l^g&(c^l))+p[10]+4294925233&4294967295,f=g+(u<<17&4294967295|u>>>15),u=l+(c^f&(g^c))+p[11]+2304563134&4294967295,l=f+(u<<22&4294967295|u>>>10),u=c+(g^l&(f^g))+p[12]+1804603682&4294967295,c=l+(u<<7&4294967295|u>>>25),u=g+(f^c&(l^f))+p[13]+4254626195&4294967295,g=c+(u<<12&4294967295|u>>>20),u=f+(l^g&(c^l))+p[14]+2792965006&4294967295,f=g+(u<<17&4294967295|u>>>15),u=l+(c^f&(g^c))+p[15]+1236535329&4294967295,l=f+(u<<22&4294967295|u>>>10),u=c+(f^g&(l^f))+p[1]+4129170786&4294967295,c=l+(u<<5&4294967295|u>>>27),u=g+(l^f&(c^l))+p[6]+3225465664&4294967295,g=c+(u<<9&4294967295|u>>>23),u=f+(c^l&(g^c))+p[11]+643717713&4294967295,f=g+(u<<14&4294967295|u>>>18),u=l+(g^c&(f^g))+p[0]+3921069994&4294967295,l=f+(u<<20&4294967295|u>>>12),u=c+(f^g&(l^f))+p[5]+3593408605&4294967295,c=l+(u<<5&4294967295|u>>>27),u=g+(l^f&(c^l))+p[10]+38016083&4294967295,g=c+(u<<9&4294967295|u>>>23),u=f+(c^l&(g^c))+p[15]+3634488961&4294967295,f=g+(u<<14&4294967295|u>>>18),u=l+(g^c&(f^g))+p[4]+3889429448&4294967295,l=f+(u<<20&4294967295|u>>>12),u=c+(f^g&(l^f))+p[9]+568446438&4294967295,c=l+(u<<5&4294967295|u>>>27),u=g+(l^f&(c^l))+p[14]+3275163606&4294967295,g=c+(u<<9&4294967295|u>>>23),u=f+(c^l&(g^c))+p[3]+4107603335&4294967295,f=g+(u<<14&4294967295|u>>>18),u=l+(g^c&(f^g))+p[8]+1163531501&4294967295,l=f+(u<<20&4294967295|u>>>12),u=c+(f^g&(l^f))+p[13]+2850285829&4294967295,c=l+(u<<5&4294967295|u>>>27),u=g+(l^f&(c^l))+p[2]+4243563512&4294967295,g=c+(u<<9&4294967295|u>>>23),u=f+(c^l&(g^c))+p[7]+1735328473&4294967295,f=g+(u<<14&4294967295|u>>>18),u=l+(g^c&(f^g))+p[12]+2368359562&4294967295,l=f+(u<<20&4294967295|u>>>12),u=c+(l^f^g)+p[5]+4294588738&4294967295,c=l+(u<<4&4294967295|u>>>28),u=g+(c^l^f)+p[8]+2272392833&4294967295,g=c+(u<<11&4294967295|u>>>21),u=f+(g^c^l)+p[11]+1839030562&4294967295,f=g+(u<<16&4294967295|u>>>16),u=l+(f^g^c)+p[14]+4259657740&4294967295,l=f+(u<<23&4294967295|u>>>9),u=c+(l^f^g)+p[1]+2763975236&4294967295,c=l+(u<<4&4294967295|u>>>28),u=g+(c^l^f)+p[4]+1272893353&4294967295,g=c+(u<<11&4294967295|u>>>21),u=f+(g^c^l)+p[7]+4139469664&4294967295,f=g+(u<<16&4294967295|u>>>16),u=l+(f^g^c)+p[10]+3200236656&4294967295,l=f+(u<<23&4294967295|u>>>9),u=c+(l^f^g)+p[13]+681279174&4294967295,c=l+(u<<4&4294967295|u>>>28),u=g+(c^l^f)+p[0]+3936430074&4294967295,g=c+(u<<11&4294967295|u>>>21),u=f+(g^c^l)+p[3]+3572445317&4294967295,f=g+(u<<16&4294967295|u>>>16),u=l+(f^g^c)+p[6]+76029189&4294967295,l=f+(u<<23&4294967295|u>>>9),u=c+(l^f^g)+p[9]+3654602809&4294967295,c=l+(u<<4&4294967295|u>>>28),u=g+(c^l^f)+p[12]+3873151461&4294967295,g=c+(u<<11&4294967295|u>>>21),u=f+(g^c^l)+p[15]+530742520&4294967295,f=g+(u<<16&4294967295|u>>>16),u=l+(f^g^c)+p[2]+3299628645&4294967295,l=f+(u<<23&4294967295|u>>>9),u=c+(f^(l|~g))+p[0]+4096336452&4294967295,c=l+(u<<6&4294967295|u>>>26),u=g+(l^(c|~f))+p[7]+1126891415&4294967295,g=c+(u<<10&4294967295|u>>>22),u=f+(c^(g|~l))+p[14]+2878612391&4294967295,f=g+(u<<15&4294967295|u>>>17),u=l+(g^(f|~c))+p[5]+4237533241&4294967295,l=f+(u<<21&4294967295|u>>>11),u=c+(f^(l|~g))+p[12]+1700485571&4294967295,c=l+(u<<6&4294967295|u>>>26),u=g+(l^(c|~f))+p[3]+2399980690&4294967295,g=c+(u<<10&4294967295|u>>>22),u=f+(c^(g|~l))+p[10]+4293915773&4294967295,f=g+(u<<15&4294967295|u>>>17),u=l+(g^(f|~c))+p[1]+2240044497&4294967295,l=f+(u<<21&4294967295|u>>>11),u=c+(f^(l|~g))+p[8]+1873313359&4294967295,c=l+(u<<6&4294967295|u>>>26),u=g+(l^(c|~f))+p[15]+4264355552&4294967295,g=c+(u<<10&4294967295|u>>>22),u=f+(c^(g|~l))+p[6]+2734768916&4294967295,f=g+(u<<15&4294967295|u>>>17),u=l+(g^(f|~c))+p[13]+1309151649&4294967295,l=f+(u<<21&4294967295|u>>>11),u=c+(f^(l|~g))+p[4]+4149444226&4294967295,c=l+(u<<6&4294967295|u>>>26),u=g+(l^(c|~f))+p[11]+3174756917&4294967295,g=c+(u<<10&4294967295|u>>>22),u=f+(c^(g|~l))+p[2]+718787259&4294967295,f=g+(u<<15&4294967295|u>>>17),u=l+(g^(f|~c))+p[9]+3951481745&4294967295,d.g[0]=d.g[0]+c&4294967295,d.g[1]=d.g[1]+(f+(u<<21&4294967295|u>>>11))&4294967295,d.g[2]=d.g[2]+f&4294967295,d.g[3]=d.g[3]+g&4294967295}r.prototype.v=function(d,c){c===void 0&&(c=d.length);let l=c-this.blockSize,p=this.C,f=this.h,g=0;for(;g<c;){if(f==0)for(;g<=l;)i(this,d,g),g+=this.blockSize;if(typeof d=="string"){for(;g<c;)if(p[f++]=d.charCodeAt(g++),f==this.blockSize){i(this,p),f=0;break}}else for(;g<c;)if(p[f++]=d[g++],f==this.blockSize){i(this,p),f=0;break}}this.h=f,this.o+=c},r.prototype.A=function(){var d=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);d[0]=128;for(var c=1;c<d.length-8;++c)d[c]=0;c=this.o*8;for(var l=d.length-8;l<d.length;++l)d[l]=c&255,c/=256;for(this.v(d),d=Array(16),c=0,l=0;l<4;++l)for(let p=0;p<32;p+=8)d[c++]=this.g[l]>>>p&255;return d};function s(d,c){var l=a;return Object.prototype.hasOwnProperty.call(l,d)?l[d]:l[d]=c(d)}function o(d,c){this.h=c;let l=[],p=!0;for(let f=d.length-1;f>=0;f--){let g=d[f]|0;p&&g==c||(l[f]=g,p=!1)}this.g=l}var a={};function h(d){return-128<=d&&d<128?s(d,function(c){return new o([c|0],c<0?-1:0)}):new o([d|0],d<0?-1:0)}function m(d){if(isNaN(d)||!isFinite(d))return E;if(d<0)return R(m(-d));let c=[],l=1;for(let p=0;d>=l;p++)c[p]=d/l|0,l*=4294967296;return new o(c,0)}function y(d,c){if(d.length==0)throw Error("number format error: empty string");if(c=c||10,c<2||36<c)throw Error("radix out of range: "+c);if(d.charAt(0)=="-")return R(y(d.substring(1),c));if(d.indexOf("-")>=0)throw Error('number format error: interior "-" character');let l=m(Math.pow(c,8)),p=E;for(let g=0;g<d.length;g+=8){var f=Math.min(8,d.length-g);let u=parseInt(d.substring(g,g+f),c);f<8?(f=m(Math.pow(c,f)),p=p.j(f).add(m(u))):(p=p.j(l),p=p.add(m(u)))}return p}var E=h(0),T=h(1),N=h(16777216);n=o.prototype,n.m=function(){if(D(this))return-R(this).m();let d=0,c=1;for(let l=0;l<this.g.length;l++){let p=this.i(l);d+=(p>=0?p:4294967296+p)*c,c*=4294967296}return d},n.toString=function(d){if(d=d||10,d<2||36<d)throw Error("radix out of range: "+d);if(S(this))return"0";if(D(this))return"-"+R(this).toString(d);let c=m(Math.pow(d,6));var l=this;let p="";for(;;){let f=Vt(l,c).g;l=le(l,f.j(c));let g=((l.g.length>0?l.g[0]:l.h)>>>0).toString(d);if(l=f,S(l))return g+p;for(;g.length<6;)g="0"+g;p=g+p}},n.i=function(d){return d<0?0:d<this.g.length?this.g[d]:this.h};function S(d){if(d.h!=0)return!1;for(let c=0;c<d.g.length;c++)if(d.g[c]!=0)return!1;return!0}function D(d){return d.h==-1}n.l=function(d){return d=le(this,d),D(d)?-1:S(d)?0:1};function R(d){let c=d.g.length,l=[];for(let p=0;p<c;p++)l[p]=~d.g[p];return new o(l,~d.h).add(T)}n.abs=function(){return D(this)?R(this):this},n.add=function(d){let c=Math.max(this.g.length,d.g.length),l=[],p=0;for(let f=0;f<=c;f++){let g=p+(this.i(f)&65535)+(d.i(f)&65535),u=(g>>>16)+(this.i(f)>>>16)+(d.i(f)>>>16);p=u>>>16,g&=65535,u&=65535,l[f]=u<<16|g}return new o(l,l[l.length-1]&-2147483648?-1:0)};function le(d,c){return d.add(R(c))}n.j=function(d){if(S(this)||S(d))return E;if(D(this))return D(d)?R(this).j(R(d)):R(R(this).j(d));if(D(d))return R(this.j(R(d)));if(this.l(N)<0&&d.l(N)<0)return m(this.m()*d.m());let c=this.g.length+d.g.length,l=[];for(var p=0;p<2*c;p++)l[p]=0;for(p=0;p<this.g.length;p++)for(let f=0;f<d.g.length;f++){let g=this.i(p)>>>16,u=this.i(p)&65535,Te=d.i(f)>>>16,Vi=d.i(f)&65535;l[2*p+2*f]+=u*Vi,Oe(l,2*p+2*f),l[2*p+2*f+1]+=g*Vi,Oe(l,2*p+2*f+1),l[2*p+2*f+1]+=u*Te,Oe(l,2*p+2*f+1),l[2*p+2*f+2]+=g*Te,Oe(l,2*p+2*f+2)}for(d=0;d<c;d++)l[d]=l[2*d+1]<<16|l[2*d];for(d=c;d<2*c;d++)l[d]=0;return new o(l,0)};function Oe(d,c){for(;(d[c]&65535)!=d[c];)d[c+1]+=d[c]>>>16,d[c]&=65535,c++}function Xe(d,c){this.g=d,this.h=c}function Vt(d,c){if(S(c))throw Error("division by zero");if(S(d))return new Xe(E,E);if(D(d))return c=Vt(R(d),c),new Xe(R(c.g),R(c.h));if(D(c))return c=Vt(d,R(c)),new Xe(R(c.g),c.h);if(d.g.length>30){if(D(d)||D(c))throw Error("slowDivide_ only works with positive integers.");for(var l=T,p=c;p.l(d)<=0;)l=Li(l),p=Li(p);var f=Le(l,1),g=Le(p,1);for(p=Le(p,2),l=Le(l,2);!S(p);){var u=g.add(p);u.l(d)<=0&&(f=f.add(l),g=u),p=Le(p,1),l=Le(l,1)}return c=le(d,f.j(c)),new Xe(f,c)}for(f=E;d.l(c)>=0;){for(l=Math.max(1,Math.floor(d.m()/c.m())),p=Math.ceil(Math.log(l)/Math.LN2),p=p<=48?1:Math.pow(2,p-48),g=m(l),u=g.j(c);D(u)||u.l(d)>0;)l-=p,g=m(l),u=g.j(c);S(g)&&(g=T),f=f.add(g),d=le(d,u)}return new Xe(f,d)}n.B=function(d){return Vt(this,d).h},n.and=function(d){let c=Math.max(this.g.length,d.g.length),l=[];for(let p=0;p<c;p++)l[p]=this.i(p)&d.i(p);return new o(l,this.h&d.h)},n.or=function(d){let c=Math.max(this.g.length,d.g.length),l=[];for(let p=0;p<c;p++)l[p]=this.i(p)|d.i(p);return new o(l,this.h|d.h)},n.xor=function(d){let c=Math.max(this.g.length,d.g.length),l=[];for(let p=0;p<c;p++)l[p]=this.i(p)^d.i(p);return new o(l,this.h^d.h)};function Li(d){let c=d.g.length+1,l=[];for(let p=0;p<c;p++)l[p]=d.i(p)<<1|d.i(p-1)>>>31;return new o(l,d.h)}function Le(d,c){let l=c>>5;c%=32;let p=d.g.length-l,f=[];for(let g=0;g<p;g++)f[g]=c>0?d.i(g+l)>>>c|d.i(g+l+1)<<32-c:d.i(g+l);return new o(f,d.h)}r.prototype.digest=r.prototype.A,r.prototype.reset=r.prototype.u,r.prototype.update=r.prototype.v,Nl=vo.Md5=r,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.B,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=m,o.fromString=y,qr=vo.Integer=o}).apply(typeof To<"u"?To:typeof self<"u"?self:typeof window<"u"?window:{});var M=class{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}};M.UNAUTHENTICATED=new M(null),M.GOOGLE_CREDENTIALS=new M("google-credentials-uid"),M.FIRST_PARTY=new M("first-party-uid"),M.MOCK_USER=new M("mock-user");var Qe="12.19.0";function Lo(n){Qe=n}var He=new he("@firebase/firestore");function ye(n,...e){if(He.logLevel<=A.DEBUG){let t=e.map(Ti);He.debug(`Firestore (${Qe}): ${n}`,...t)}}function Ct(n,...e){if(He.logLevel<=A.ERROR){let t=e.map(Ti);He.error(`Firestore (${Qe}): ${n}`,...t)}}function Vo(n,...e){if(He.logLevel<=A.WARN){let t=e.map(Ti);He.warn(`Firestore (${Qe}): ${n}`,...t)}}function Ti(n){if(typeof n=="string")return n;try{return function(t){return JSON.stringify(t)}(n)}catch{return n}}function b(n,e,t){let r="Unexpected state";typeof e=="string"?r=e:t=e,Mo(n,r,t)}function Mo(n,e,t){let r=`FIRESTORE (${Qe}) INTERNAL ASSERTION FAILED: ${e} (ID: ${n.toString(16)})`;if(t!==void 0)try{r+=" CONTEXT: "+JSON.stringify(t)}catch{r+=" CONTEXT: "+t}throw Ct(r),new Error(r)}function B(n,e,t,r){let i="Unexpected state";typeof t=="string"?i=t:r=t,n||Mo(e,i,r)}function Uo(n,e){return n}var _={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"},w=class extends ${constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}};var vn=class{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}},jr=class{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable(()=>t(M.UNAUTHENTICATED))}shutdown(){}},zr=class{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable(()=>t(this.token.user))}shutdown(){this.changeListener=null}},An=class{constructor(e){this.auth=null,e.onInit(t=>{this.auth=t})}getToken(){return this.auth?this.auth.getToken().then(e=>e?(B(typeof e.accessToken=="string",42297,{Z:e}),new vn(e.accessToken,new M(this.auth.getUid()))):null):Promise.resolve(null)}invalidateToken(){}start(e,t){}shutdown(){}},Gr=class{constructor(e,t,r){this.ee=e,this.te=t,this.re=r,this.type="FirstParty",this.user=M.FIRST_PARTY,this.ne=new Map}ie(){return this.re?this.re():null}get headers(){this.ne.set("X-Goog-AuthUser",this.ee);let e=this.ie();return e&&this.ne.set("Authorization",e),this.te&&this.ne.set("X-Goog-Iam-Authorization-Token",this.te),this.ne}},Kr=class{constructor(e,t,r){this.ee=e,this.te=t,this.re=r}getToken(){return Promise.resolve(new Gr(this.ee,this.te,this.re))}start(e,t){e.enqueueRetryable(()=>t(M.FIRST_PARTY))}shutdown(){}invalidateToken(){}},bn=class{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}},Sn=class{constructor(e,t){this.se=t,this.appCheck=null,this.oe=null,x(e)&&e.settings.appCheckToken&&(this.oe=e.settings.appCheckToken),t.onInit(r=>{this.appCheck=r})}getToken(){return this.oe?Promise.resolve(new bn(this.oe)):this.appCheck?this.appCheck.getToken().then(e=>e?(B(typeof e.token=="string",3470,{tokenResult:e}),new bn(e.token)):null):Promise.resolve(null)}invalidateToken(){}start(e,t){}shutdown(){}};var Jr=class{constructor(e,t,r,i,s,o,a,h,m,y,E,T,N){this.databaseId=e,this.appId=t,this.persistenceKey=r,this.host=i,this.ssl=s,this.forceLongPolling=o,this.autoDetectLongPolling=a,this.longPollingOptions=h,this.useFetchStreams=m,this.isUsingEmulator=y,this.apiKey=E,this._customHeaders=T,this.grpcFlowControlWindow=N}},Yr="(default)",Rn=class n{constructor(e,t){this.projectId=e,this.database=t||Yr}static empty(){return new n("","")}get isDefaultDatabase(){return this.database===Yr}isEqual(e){return e instanceof n&&e.projectId===this.projectId&&e.database===this.database}};function Fo(n,e){if(!Object.prototype.hasOwnProperty.apply(n.options,["projectId"]))throw new w(_.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new Rn(n.options.projectId,e)}function kl(n){let e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(n);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let r=0;r<n;r++)t[r]=Math.floor(256*Math.random());return t}var Qr=class{static newId(){let e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516),r="";for(;r.length<20;){let i=kl(40);for(let s=0;s<i.length;++s)r.length<20&&i[s]<t&&(r+=e.charAt(i[s]%62))}return r}};function Ie(n,e){return n<e?-1:n>e?1:0}function Cl(n,e){let t=Math.min(n.length,e.length);for(let r=0;r<t;r++){let i=n.charAt(r),s=e.charAt(r);if(i!==s)return $r(i)===$r(s)?Ie(i,s):$r(i)?1:-1}return Ie(n.length,e.length)}var Dl=55296,Ol=57343;function $r(n){let e=n.charCodeAt(0);return e>=Dl&&e<=Ol}function xo(n,e,t){return n.length===e.length&&n.every((r,i)=>t(r,e[i]))}var Ao="__name__",Pn=class n{constructor(e,t,r){t===void 0?t=0:t>e.length&&b(637,{offset:t,range:e.length}),r===void 0?r=e.length-t:r>e.length-t&&b(1746,{length:r,range:e.length-t}),this.segments=e,this.offset=t,this.len=r}get length(){return this.len}isEqual(e){return n.comparator(this,e)===0}child(e){let t=this.segments.slice(this.offset,this.limit());return e instanceof n?e.forEach(r=>{t.push(r)}):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,r=this.limit();t<r;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){let r=Math.min(e.length,t.length);for(let i=0;i<r;i++){let s=n.compareSegments(e.get(i),t.get(i));if(s!==0)return s}return Ie(e.length,t.length)}static compareSegments(e,t){let r=n.isNumericId(e),i=n.isNumericId(t);return r&&!i?-1:!r&&i?1:r&&i?n.extractNumericId(e).compare(n.extractNumericId(t)):Cl(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return qr.fromString(e.substring(4,e.length-2))}},U=class n extends Pn{construct(e,t,r){return new n(e,t,r)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toStringWithLeadingSlash(){return`/${this.canonicalString()}`}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){let t=[];for(let r of e){if(r.indexOf("//")>=0)throw new w(_.INVALID_ARGUMENT,`Invalid segment (${r}). Paths must not contain // in them.`);t.push(...r.split("/").filter(i=>i.length>0))}return new n(t)}static emptyPath(){return new n([])}},Ll=/^[_a-zA-Z][_a-zA-Z0-9]*$/,vt=class Be extends Pn{construct(e,t,r){return new Be(e,t,r)}static isValidIdentifier(e){return Ll.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),Be.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===Ao}static keyField(){return new Be([Ao])}static fromServerFormat(e){let t=[],r="",i=0,s=()=>{if(r.length===0)throw new w(_.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(r),r=""},o=!1;for(;i<e.length;){let a=e[i];if(a==="\\"){if(i+1===e.length)throw new w(_.INVALID_ARGUMENT,"Path has trailing escape character: "+e);let h=e[i+1];if(h!=="\\"&&h!=="."&&h!=="`")throw new w(_.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);r+=h,i+=2}else a==="`"?(o=!o,i++):a!=="."||o?(r+=a,i++):(s(),i++)}if(s(),o)throw new w(_.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new Be(t)}static emptyPath(){return new Be([])}};var Y=class n{constructor(e){this.path=e}static fromPath(e){return new n(U.fromString(e))}static fromName(e){return new n(U.fromString(e).popFirst(5))}static empty(){return new n(U.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&U.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return U.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new n(new U(e.slice()))}};function Vl(n,e,t){if(!t)throw new w(_.INVALID_ARGUMENT,`Function ${n}() cannot be called with an empty ${e}.`)}function bo(n){if(!Y.isDocumentKey(n))throw new w(_.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${n} has ${n.length}.`)}function qo(n){return typeof n=="object"&&n!==null&&(Object.getPrototypeOf(n)===Object.prototype||Object.getPrototypeOf(n)===null)}function vi(n){if(n===void 0)return"undefined";if(n===null)return"null";if(typeof n=="string")return n.length>20&&(n=`${n.substring(0,20)}...`),JSON.stringify(n);if(typeof n=="number"||typeof n=="boolean")return""+n;if(typeof n=="object"){if(n instanceof Array)return"an array";{let e=function(r){return r.constructor?r.constructor.name:null}(n);return e?`a custom ${e} object`:"an object"}}return typeof n=="function"?"a function":b(12329,{type:typeof n})}function qn(n,e){if("_delegate"in n&&(n=n._delegate),!(n instanceof e)){if(e.name===n.constructor.name)throw new w(_.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{let t=vi(n);throw new w(_.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return n}function $o(n){let e={};return n.timeoutSeconds!==void 0&&(e.timeoutSeconds=n.timeoutSeconds),e}var wn=null;function Ml(){return wn===null?wn=function(){return 268435456+Math.round(2147483648*Math.random())}():wn++,"0x"+wn.toString(16)}function Bo(n){return n==null}function Nn(n){return n===0&&1/n==-1/0}var Br="RestConnection",Ul={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery",ExecutePipeline:"executePipeline"},Xr=class{get ae(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;let t=e.ssl?"https":"http",r=encodeURIComponent(this.databaseId.projectId),i=encodeURIComponent(this.databaseId.database);this.ue=t+"://"+e.host,this._e=`projects/${r}/databases/${i}`,this.ce=this.databaseId.database===Yr?`project_id=${r}`:`project_id=${r}&database_id=${i}`}le(e,t,r,i,s){let o=Ml(),a=this.he(e,t.toUriEncodedString());ye(Br,`Sending RPC '${e}' ${o}:`,a,r);let h={"google-cloud-resource-prefix":this._e,"x-goog-request-params":this.ce};this.fe(h,i,s);let{host:m}=new URL(a),y=ve(m);return this.me(e,a,h,r,y).then(E=>(ye(Br,`Received RPC '${e}' ${o}: `,E),E),E=>{throw Vo(Br,`RPC '${e}' ${o} failed with error: `,E,"url: ",a,"request:",r),E})}de(e,t,r,i,s,o){return this.le(e,t,r,i,s)}fe(e,t,r){if(e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+Qe}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach((i,s)=>e[s]=i),r&&r.headers.forEach((i,s)=>e[s]=i),this.databaseInfo._customHeaders)for(let i of Object.keys(this.databaseInfo._customHeaders))e[i]=this.databaseInfo._customHeaders[i]}he(e,t){let r=Ul[e],i=`${this.ue}/v1/${t}:${r}`;return this.databaseInfo.apiKey&&(i=`${i}?key=${encodeURIComponent(this.databaseInfo.apiKey)}`),i}terminate(){}};var So,v;function Wo(n){switch(n){case _.OK:return b(64938);case _.CANCELLED:case _.UNKNOWN:case _.DEADLINE_EXCEEDED:case _.RESOURCE_EXHAUSTED:case _.INTERNAL:case _.UNAVAILABLE:case _.UNAUTHENTICATED:return!1;case _.INVALID_ARGUMENT:case _.NOT_FOUND:case _.ALREADY_EXISTS:case _.PERMISSION_DENIED:case _.FAILED_PRECONDITION:case _.ABORTED:case _.OUT_OF_RANGE:case _.UNIMPLEMENTED:case _.DATA_LOSS:return!0;default:return b(15467,{code:n})}}function Ro(n){if(n===void 0)return Ct("RPC_ERROR","HTTP error has no status"),_.UNKNOWN;switch(n){case 200:return _.OK;case 400:return _.FAILED_PRECONDITION;case 401:return _.UNAUTHENTICATED;case 403:return _.PERMISSION_DENIED;case 404:return _.NOT_FOUND;case 409:return _.ABORTED;case 416:return _.OUT_OF_RANGE;case 429:return _.RESOURCE_EXHAUSTED;case 499:return _.CANCELLED;case 500:return _.UNKNOWN;case 501:return _.UNIMPLEMENTED;case 503:return _.UNAVAILABLE;case 504:return _.DEADLINE_EXCEEDED;default:return n>=200&&n<300?_.OK:n>=400&&n<500?_.FAILED_PRECONDITION:n>=500&&n<600?_.INTERNAL:_.UNKNOWN}}(v=So||(So={}))[v.OK=0]="OK",v[v.CANCELLED=1]="CANCELLED",v[v.UNKNOWN=2]="UNKNOWN",v[v.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",v[v.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",v[v.NOT_FOUND=5]="NOT_FOUND",v[v.ALREADY_EXISTS=6]="ALREADY_EXISTS",v[v.PERMISSION_DENIED=7]="PERMISSION_DENIED",v[v.UNAUTHENTICATED=16]="UNAUTHENTICATED",v[v.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",v[v.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",v[v.ABORTED=10]="ABORTED",v[v.OUT_OF_RANGE=11]="OUT_OF_RANGE",v[v.UNIMPLEMENTED=12]="UNIMPLEMENTED",v[v.INTERNAL=13]="INTERNAL",v[v.UNAVAILABLE=14]="UNAVAILABLE",v[v.DATA_LOSS=15]="DATA_LOSS";var Zr=class extends Xr{Ee(e,t){throw new Error("Not supported by FetchConnection")}async me(e,t,r,i,s){let o=JSON.stringify(i),a;try{let h={method:"POST",headers:r,body:o};s&&(h.credentials="include"),a=await fetch(t,h)}catch(h){let m=h,y=m?.message,E=m?.cause?String(m.cause):void 0,T=(y&&E?`${y} (${E})`:y??E)??m?.statusText??String(h);throw new w(Ro(m?.status),`Request failed with error: ${T}`)}if(!a.ok){let h=await a.json();Array.isArray(h)&&(h=h[0]);let m=h?.error?.message;throw new w(Ro(a.status),`Request failed with error: ${m??a.statusText}`)}return a.json()}};function Po(n){let e=0;for(let t in n)Object.prototype.hasOwnProperty.call(n,t)&&e++;return e}function Dt(n,e){for(let t in n)Object.prototype.hasOwnProperty.call(n,t)&&e(t,n[t])}var ei=class extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}};var Ee=class n{constructor(e){this.binaryString=e}static fromBase64String(e){let t=function(i){try{return atob(i)}catch(s){throw typeof DOMException<"u"&&s instanceof DOMException?new ei("Invalid base64 string: "+s):s}}(e);return new n(t)}static fromUint8Array(e){let t=function(i){let s="";for(let o=0;o<i.length;++o)s+=String.fromCharCode(i[o]);return s}(e);return new n(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(t){return btoa(t)}(this.binaryString)}toUint8Array(){return function(t){let r=new Uint8Array(t.length);for(let i=0;i<t.length;i++)r[i]=t.charCodeAt(i);return r}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return Ie(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}};Ee.EMPTY_BYTE_STRING=new Ee("");var Fl=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function At(n){if(B(!!n,39018),typeof n=="string"){let e=0,t=Fl.exec(n);if(B(!!t,46558,{timestamp:n}),t[1]){let i=t[1];i=(i+"000000000").substr(0,9),e=Number(i)}let r=new Date(n);return{seconds:Math.floor(r.getTime()/1e3),nanos:e}}return{seconds:q(n.seconds),nanos:q(n.nanos)}}function q(n){return typeof n=="number"?n:typeof n=="string"?Number(n):0}function ti(n){return typeof n=="string"?Ee.fromBase64String(n):Ee.fromUint8Array(n)}function z(n,e){let t={typeString:n};return e&&(t.value=e),t}function Ot(n,e){if(!qo(n))throw new w(_.INVALID_ARGUMENT,"JSON must be an object");let t;for(let r in e)if(e[r]){let i=e[r].typeString,s="value"in e[r]?{value:e[r].value}:void 0;if(!(r in n)){t=`JSON missing required field: '${r}'`;break}let o=n[r];if(i&&typeof o!==i){t=`JSON field '${r}' must be a ${i}.`;break}if(s!==void 0&&o!==s.value){t=`Expected '${r}' field to equal '${s.value}'`;break}}if(t)throw new w(_.INVALID_ARGUMENT,t);return!0}var No=-62135596800,ko=1e6,L=class n{static now(){return n.fromMillis(Date.now())}static fromDate(e){return n.fromMillis(e.getTime())}static fromMillis(e){let t=Math.floor(e/1e3),r=Math.floor((e-1e3*t)*ko);return new n(t,r)}static fromInstant(e){if(!e||typeof e.Te!="bigint")throw new w(_.INVALID_ARGUMENT,"Invalid Temporal.Instant object provided.");return n._fromEpochNanoseconds(e.Te)}static _fromEpochNanoseconds(e){let t,r;if(e>=0n)t=Number(e/1000000000n),r=Number(e%1000000000n);else{let i=e%1000000000n;i===0n?(t=Number(e/1000000000n),r=0):(t=Number(e/1000000000n-1n),r=Number(i+1000000000n))}return new n(t,r)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new w(_.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new w(_.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<No)throw new w(_.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new w(_.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/ko}toInstant(){if(typeof Temporal>"u"||!Temporal.Instant)throw new w(_.FAILED_PRECONDITION,"The Temporal object is not available in the current environment.");let e=1000000000n*BigInt(this.seconds)+BigInt(this.nanoseconds);return Temporal.Instant.__PRIVATE_fromEpochNanoseconds(e)}_compareTo(e){return this.seconds===e.seconds?Ie(this.nanoseconds,e.nanoseconds):Ie(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:n._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(Ot(e,n._jsonSchema))return new n(e.seconds,e.nanoseconds)}valueOf(){let e=this.seconds-No;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}};L._jsonSchemaVersion="firestore/timestamp/1.0",L._jsonSchema={type:z("string",L._jsonSchemaVersion),seconds:z("number"),nanoseconds:z("number")};function Ho(n){return(n?.mapValue?.fields||{}).__type__?.stringValue==="server_timestamp"}function jo(n){let e=n.mapValue.fields.__previous_value__;return Ho(e)?jo(e):e}function ni(n){let e=At(n.mapValue.fields.__local_write_time__.timestampValue);return new L(e.seconds,e.nanos)}var zo="__type__",xl="__max__";var Go="__vector__",Ko="value";function ri(n){return"nullValue"in n?0:"booleanValue"in n?1:"integerValue"in n||"doubleValue"in n?2:"timestampValue"in n?3:"stringValue"in n?5:"bytesValue"in n?6:"referenceValue"in n?7:"geoPointValue"in n?8:"arrayValue"in n?9:"mapValue"in n?Ho(n)?4:function(t){return(((t.mapValue||{}).fields||{}).__type__||{}).stringValue===xl}(n)?9007199254740991:function(t){return(t?.mapValue?.fields||{})[zo]?.stringValue===Go}(n)?10:11:b(28295,{value:n})}function ii(n,e,t){if(n===e)return!0;let r=ri(n);if(r!==ri(e))return!1;switch(r){case 0:case 9007199254740991:return!0;case 1:return n.booleanValue===e.booleanValue;case 4:return ni(n).isEqual(ni(e));case 3:return function(s,o){if(typeof s.timestampValue=="string"&&typeof o.timestampValue=="string"&&s.timestampValue.length===o.timestampValue.length)return s.timestampValue===o.timestampValue;let a=At(s.timestampValue),h=At(o.timestampValue);return a.seconds===h.seconds&&a.nanos===h.nanos}(n,e);case 5:return n.stringValue===e.stringValue;case 6:return function(s,o){return ti(s.bytesValue).isEqual(ti(o.bytesValue))}(n,e);case 7:return n.referenceValue===e.referenceValue;case 8:return function(s,o){return q(s.geoPointValue.latitude)===q(o.geoPointValue.latitude)&&q(s.geoPointValue.longitude)===q(o.geoPointValue.longitude)}(n,e);case 2:return function(s,o,a){if("integerValue"in s&&"integerValue"in o)return q(s.integerValue)===q(o.integerValue);let h,m;return!("doubleValue"in s)||!("doubleValue"in o)?!1:(h=q(s.doubleValue),m=q(o.doubleValue),h===m?Nn(h)===Nn(m):!!(a===void 0||a.Pe)&&isNaN(h)&&isNaN(m))}(n,e,t);case 9:return xo(n.arrayValue.values||[],e.arrayValue.values||[],(i,s)=>ii(i,s,t));case 10:case 11:return function(s,o,a){let h=s.mapValue.fields||{},m=o.mapValue.fields||{};if(Po(h)!==Po(m))return!1;for(let y in h)if(h.hasOwnProperty(y)&&(m[y]===void 0||!ii(h[y],m[y],a)))return!1;return!0}(n,e,t);default:return b(52216,{left:n})}}function Wr(n){return!!n&&"mapValue"in n}function wt(n){if(n.geoPointValue)return{geoPointValue:{...n.geoPointValue}};if(n.timestampValue&&typeof n.timestampValue=="object")return{timestampValue:{...n.timestampValue}};if(n.mapValue){let e={mapValue:{fields:{}}};return Dt(n.mapValue.fields,(t,r)=>e.mapValue.fields[t]=wt(r)),e}if(n.arrayValue){let e={arrayValue:{values:[]}};for(let t=0;t<(n.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=wt(n.arrayValue.values[t]);return e}return{...n}}var C=class n{static fromTimestamp(e){return new n(e)}static min(){return new n(new L(0,0))}static max(){return new n(new L(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}};var si=class n{constructor(e,t){this.comparator=e,this.root=t||te.EMPTY}insert(e,t){return new n(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,te.BLACK,null,null))}remove(e){return new n(this.comparator,this.root.remove(e,this.comparator).copy(null,null,te.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){let r=this.comparator(e,t.key);if(r===0)return t.value;r<0?t=t.left:r>0&&(t=t.right)}return null}indexOf(e){let t=0,r=this.root;for(;!r.isEmpty();){let i=this.comparator(e,r.key);if(i===0)return t+r.left.size;i<0?r=r.left:(t+=r.left.size+1,r=r.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((t,r)=>(e(t,r),!1))}toString(){let e=[];return this.inorderTraversal((t,r)=>(e.push(`${t}:${r}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new We(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new We(this.root,e,this.comparator,!1)}getReverseIterator(){return new We(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new We(this.root,e,this.comparator,!0)}},We=class{constructor(e,t,r,i){this.isReverse=i,this.nodeStack=[];let s=1;for(;!e.isEmpty();)if(s=t?r(e.key,t):1,t&&i&&(s*=-1),s<0)e=this.isReverse?e.left:e.right;else{if(s===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop(),t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;let e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}},te=class n{constructor(e,t,r,i,s){this.key=e,this.value=t,this.color=r??n.RED,this.left=i??n.EMPTY,this.right=s??n.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,r,i,s){return new n(e??this.key,t??this.value,r??this.color,i??this.left,s??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,r){let i=this,s=r(e,i.key);return i=s<0?i.copy(null,null,null,i.left.insert(e,t,r),null):s===0?i.copy(null,t,null,null,null):i.copy(null,null,null,null,i.right.insert(e,t,r)),i.fixUp()}removeMin(){if(this.left.isEmpty())return n.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let r,i=this;if(t(e,i.key)<0)i.left.isEmpty()||i.left.isRed()||i.left.left.isRed()||(i=i.moveRedLeft()),i=i.copy(null,null,null,i.left.remove(e,t),null);else{if(i.left.isRed()&&(i=i.rotateRight()),i.right.isEmpty()||i.right.isRed()||i.right.left.isRed()||(i=i.moveRedRight()),t(e,i.key)===0){if(i.right.isEmpty())return n.EMPTY;r=i.right.min(),i=i.copy(r.key,r.value,null,null,i.right.removeMin())}i=i.copy(null,null,null,null,i.right.remove(e,t))}return i.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){let e=this.copy(null,null,n.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){let e=this.copy(null,null,n.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){let e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){let e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw b(43730,{key:this.key,value:this.value});if(this.right.isRed())throw b(14113,{key:this.key,value:this.value});let e=this.left.check();if(e!==this.right.check())throw b(27949);return e+(this.isRed()?0:1)}};te.EMPTY=null,te.RED=!0,te.BLACK=!1;te.EMPTY=new class{constructor(){this.size=0}get key(){throw b(57766)}get value(){throw b(16141)}get color(){throw b(16727)}get left(){throw b(29726)}get right(){throw b(36894)}copy(e,t,r,i,s){return this}insert(e,t,r){return new te(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};var oi=class n{constructor(e){this.comparator=e,this.data=new si(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((t,r)=>(e(t),!1))}forEachInRange(e,t){let r=this.data.getIteratorFrom(e[0]);for(;r.hasNext();){let i=r.getNext();if(this.comparator(i.key,e[1])>=0)return;t(i.key)}}forEachWhile(e,t){let r;for(r=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();r.hasNext();)if(!e(r.getNext().key))return}firstAfterOrEqual(e){let t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new kn(this.data.getIterator())}getIteratorFrom(e){return new kn(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach(r=>{t=t.add(r)}),t}isEqual(e){if(!(e instanceof n)||this.size!==e.size)return!1;let t=this.data.getIterator(),r=e.data.getIterator();for(;t.hasNext();){let i=t.getNext().key,s=r.getNext().key;if(this.comparator(i,s)!==0)return!1}return!0}toArray(){let e=[];return this.forEach(t=>{e.push(t)}),e}toString(){let e=[];return this.forEach(t=>e.push(t)),"SortedSet("+e.toString()+")"}copy(e){let t=new n(this.comparator);return t.data=e,t}},kn=class{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}};var je=class n{constructor(e){this.fields=e,e.sort(vt.comparator)}static empty(){return new n([])}unionWith(e){let t=new oi(vt.comparator);for(let r of this.fields)t=t.add(r);for(let r of e)t=t.add(r);return new n(t.toArray())}covers(e){for(let t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return xo(this.fields,e.fields,(t,r)=>t.isEqual(r))}};var j=class n{constructor(e){this.value=e}static empty(){return new n({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let r=0;r<e.length-1;++r)if(t=(t.mapValue.fields||{})[e.get(r)],!Wr(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=wt(t)}setAll(e){let t=vt.emptyPath(),r={},i=[];e.forEach((o,a)=>{if(!t.isImmediateParentOf(a)){let h=this.getFieldsMap(t);this.applyChanges(h,r,i),r={},i=[],t=a.popLast()}o?r[a.lastSegment()]=wt(o):i.push(a.lastSegment())});let s=this.getFieldsMap(t);this.applyChanges(s,r,i)}delete(e){let t=this.field(e.popLast());Wr(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return ii(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let r=0;r<e.length;++r){let i=t.mapValue.fields[e.get(r)];Wr(i)&&i.mapValue.fields||(i={mapValue:{fields:{}}},t.mapValue.fields[e.get(r)]=i),t=i}return t.mapValue.fields}applyChanges(e,t,r){Dt(t,(i,s)=>e[i]=s);for(let i of r)delete e[i]}clone(){return new n(wt(this.value))}};var Cn=class n{constructor(e,t,r,i,s,o,a){this.key=e,this.documentType=t,this.version=r,this.readTime=i,this.createTime=s,this.data=o,this.documentState=a}static newInvalidDocument(e){return new n(e,0,C.min(),C.min(),C.min(),j.empty(),0)}static newFoundDocument(e,t,r,i){return new n(e,1,t,C.min(),r,i,0)}static newNoDocument(e,t){return new n(e,2,t,C.min(),C.min(),j.empty(),0)}static newUnknownDocument(e,t){return new n(e,3,t,C.min(),C.min(),j.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(C.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=j.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=j.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=C.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof n&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new n(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}};var ai=class{constructor(e,t=null,r=[],i=[],s=null,o="F",a=null,h=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=r,this.filters=i,this.limit=s,this.limitType=o,this.startAt=a,this.endAt=h,this.pe=null,this.ye=null,this.we=null,this.startAt,this.endAt}};function Jo(n,e){if(n.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:Nn(e)?"-0":e}}function ql(n,e,t){return function(i){return typeof i=="number"&&Number.isInteger(i)&&!Nn(i)&&i<=Number.MAX_SAFE_INTEGER&&i>=Number.MIN_SAFE_INTEGER}(e)?function(i){return{integerValue:""+i}}(e):Jo(n,e)}var ze=class{constructor(){this._=void 0}},ci=class extends ze{},ui=class extends ze{constructor(e){super(),this.elements=e}},li=class extends ze{constructor(e){super(),this.elements=e}},bt=class extends ze{constructor(e,t){super(),this.serializer=e,this.ge=t}},hi=class extends bt{},di=class extends bt{},fi=class extends bt{};var we=class n{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new n}static exists(e){return new n(void 0,e)}static updateTime(e){return new n(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}},Ge=class{},Dn=class extends Ge{constructor(e,t,r,i=[]){super(),this.key=e,this.value=t,this.precondition=r,this.fieldTransforms=i,this.type=0}getFieldMask(){return null}},St=class extends Ge{constructor(e,t,r,i,s=[]){super(),this.key=e,this.data=t,this.fieldMask=r,this.precondition=i,this.fieldTransforms=s,this.type=1}getFieldMask(){return this.fieldMask}},Rt=class extends Ge{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}},Pt=class extends Ge{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}};var pi=class{constructor(e,t){this.databaseId=e,this.useProto3Json=t}};function Tn(n,e){return n.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function $l(n,e){return n.useProto3Json?e.toBase64():e.toUint8Array()}function Bl(n,e){return Tn(n,e.toTimestamp())}function Hr(n){return B(!!n,49232),C.fromTimestamp(function(t){let r=At(t);return new L(r.seconds,r.nanos)}(n))}function Yo(n,e){return mi(n,e).canonicalString()}function mi(n,e){let t=function(i){return new U(["projects",i.projectId,"databases",i.database])}(n).child("documents");return e===void 0?t:t.child(e)}function On(n,e){return Yo(n.databaseId,e.path)}function Co(n,e){let t=function(i){let s=U.fromString(i);return B(Qo(s),10190,{key:s.toString()}),s}(e);if(t.get(1)!==n.databaseId.projectId)throw new w(_.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+n.databaseId.projectId);if(t.get(3)!==n.databaseId.database)throw new w(_.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+n.databaseId.database);return new Y(function(i){return B(i.length>4&&i.get(4)==="documents",29091,{key:i.toString()}),i.popFirst(5)}(t))}function Do(n,e,t){return{name:On(n,e),fields:t.value.mapValue.fields}}function Wl(n,e){return"found"in e?function(r,i){B(!!i.found,43571),i.found.name,i.found.updateTime;let s=Co(r,i.found.name),o=Hr(i.found.updateTime),a=i.found.createTime?Hr(i.found.createTime):C.min(),h=new j({mapValue:{fields:i.found.fields}});return Cn.newFoundDocument(s,o,a,h)}(n,e):"missing"in e?function(r,i){B(!!i.missing,3894),B(!!i.readTime,22933);let s=Co(r,i.missing),o=Hr(i.readTime);return Cn.newNoDocument(s,o)}(n,e):b(7234,{result:e})}function Hl(n,e){let t;if(e instanceof Dn)t={update:Do(n,e.key,e.value)};else if(e instanceof Rt)t={delete:On(n,e.key)};else if(e instanceof St)t={update:Do(n,e.key,e.data),updateMask:jl(e.fieldMask)};else{if(!(e instanceof Pt))return b(16599,{Fe:e.type});t={verify:On(n,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map(r=>function(s,o){let a=o.transform;if(a instanceof ci)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(a instanceof ui)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:a.elements}};if(a instanceof li)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:a.elements}};if(a instanceof hi)return{fieldPath:o.field.canonicalString(),increment:a.ge};if(a instanceof di)return{fieldPath:o.field.canonicalString(),minimum:a.ge};if(a instanceof fi)return{fieldPath:o.field.canonicalString(),maximum:a.ge};throw b(20930,{transform:o.transform})}(0,r))),e.precondition.isNone||(t.currentDocument=function(i,s){return s.updateTime!==void 0?{updateTime:Bl(i,s.updateTime)}:s.exists!==void 0?{exists:s.exists}:b(27497)}(n,e.precondition)),t}function jl(n){let e=[];return n.fields.forEach(t=>e.push(t.canonicalString())),{fieldPaths:e}}function Qo(n){return n.length>=4&&n.get(0)==="projects"&&n.get(2)==="databases"}function Xo(n){return!!n&&typeof n._toProto=="function"&&n._protoValueType==="ProtoValue"}function Ai(n){return new pi(n,!0)}var gi=class{},_i=class extends gi{constructor(e,t,r,i){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=r,this.serializer=i,this.be=!1}De(){if(this.be)throw new w(_.FAILED_PRECONDITION,"The client has already been terminated.")}le(e,t,r,i){return this.De(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([s,o])=>this.connection.le(e,mi(t,r),i,s,o)).catch(s=>{throw s.name==="FirebaseError"?(s.code===_.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),s):new w(_.UNKNOWN,s.toString())})}de(e,t,r,i,s){return this.De(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,a])=>this.connection.de(e,mi(t,r),i,o,a,s)).catch(o=>{throw o.name==="FirebaseError"?(o.code===_.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new w(_.UNKNOWN,o.toString())})}terminate(){this.be=!0,this.connection.terminate()}};async function Zo(n,e){let t=Uo(n),r={writes:e.map(i=>Hl(t.serializer,i))};await t.le("Commit",t.serializer.databaseId,U.emptyPath(),r)}async function bi(n,e){let t=Uo(n),r={documents:e.map(a=>On(t.serializer,a))},i=await t.de("BatchGetDocuments",t.serializer.databaseId,U.emptyPath(),r,e.length),s=new Map;i.forEach(a=>{let h=Wl(t.serializer,a);s.set(h.key.toString(),h)});let o=[];return e.forEach(a=>{let h=s.get(a.toString());B(!!h,55234,{key:a}),o.push(h)}),o}var ea="ComponentProvider",Tt=new Map;function Si(n){if(n._terminated)throw new w(_.FAILED_PRECONDITION,"The client has already been terminated.");if(!Tt.has(n)){ye(ea,"Initializing Datastore");let e=function(s){return new Zr(s)}(function(s,o,a,h,m){return new Jr(s,o,a,m.host,m.ssl,m.experimentalForceLongPolling,m.experimentalAutoDetectLongPolling,$o(m.experimentalLongPollingOptions),m.useFetchStreams,m.isUsingEmulator,h,m._customHeaders,m.grpcFlowControlWindow)}(n._databaseId,n.app.options.appId||"",n._persistenceKey,n.app.options.apiKey,n._freezeSettings())),t=Ai(n._databaseId),r=function(s,o,a,h){return new _i(s,o,a,h)}(n._authCredentials,n._appCheckCredentials,e,t);Tt.set(n,r)}return Tt.get(n)}var zl=1048576,ta="firestore.googleapis.com",Oo=!0,Ln=class{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new w(_.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=ta,this.ssl=Oo}else this.host=e.host,this.ssl=e.ssl??Oo;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e._customHeaders&&(this._customHeaders={...e._customHeaders}),e.cacheSizeBytes===void 0)this.cacheSizeBytes=41943040;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<zl)throw new w(_.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}if(function(r,i,s,o){if(i===!0&&o===!0)throw new w(_.INVALID_ARGUMENT,`${r} and ${s} cannot be used together.`)}("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=$o(e.experimentalLongPollingOptions??{}),function(r){if(r.timeoutSeconds!==void 0){if(isNaN(r.timeoutSeconds))throw new w(_.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (must not be NaN)`);if(r.timeoutSeconds<5)throw new w(_.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (minimum allowed value is 5)`);if(r.timeoutSeconds>30)throw new w(_.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams,e.grpcFlowControlWindow!==void 0){if(typeof e.grpcFlowControlWindow!="number"||e.grpcFlowControlWindow<=0||e.grpcFlowControlWindow>2147483647||!Number.isInteger(e.grpcFlowControlWindow))throw new w(_.INVALID_ARGUMENT,"grpcFlowControlWindow must be a positive integer and cannot exceed 2147483647");this.grpcFlowControlWindow=e.grpcFlowControlWindow}}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(r,i){return r.timeoutSeconds===i.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams&&this.grpcFlowControlWindow===e.grpcFlowControlWindow&&function(r,i){if(r===i)return!0;if(!r||!i)return!1;let s=Object.keys(r),o=Object.keys(i);if(s.length!==o.length)return!1;for(let a of s)if(r[a]!==i[a])return!1;return!0}(this._customHeaders,e._customHeaders)}},Ce=class{constructor(e,t,r,i){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=r,this._app=i,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new Ln({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new w(_.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new w(_.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new Ln(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=function(r){if(!r)return new jr;switch(r.type){case"firstParty":return new Kr(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new w(_.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(t){let r=Tt.get(t);r&&(ye(ea,"Removing Datastore"),Tt.delete(t),r.terminate())}(this),Promise.resolve()}};function na(n,e){let t=typeof n=="object"?n:$t(),r=typeof n=="string"?n:e||"(default)",i=tt(t,"firestore/lite").getImmediate({identifier:r});if(!i._initialized){let s=qi("firestore");s&&Ri(i,...s)}return i}function Ri(n,e,t,r={}){n=qn(n,Ce);let i=ve(e),s=n._getSettings(),o={...s,emulatorOptions:n._getEmulatorOptions()},a=`${e}:${t}`;i&&Ut(`https://${a}`),s.host!==ta&&s.host!==a&&Vo("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");let h={...s,host:a,ssl:i,emulatorOptions:r};if(!G(h,o)&&(n._setSettings(h),r.mockUserToken)){let m,y;if(typeof r.mockUserToken=="string")m=r.mockUserToken,y=M.MOCK_USER;else{m=$i(r.mockUserToken,n._app?.options.projectId);let E=r.mockUserToken.sub||r.mockUserToken.user_id;if(!E)throw new w(_.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");y=new M(E)}n._authCredentials=new zr(new vn(m,y))}}var Vn=class n{constructor(e,t,r){this.converter=t,this._query=r,this.type="query",this.firestore=e}withConverter(e){return new n(this.firestore,e,this._query)}},F=class n{constructor(e,t,r){this.converter=t,this._key=r,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new Ke(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new n(this.firestore,e,this._key)}toJSON(){return{type:n._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,r){if(Ot(t,n._jsonSchema))return new n(e,r||null,new Y(U.fromString(t.referencePath)))}};F._jsonSchemaVersion="firestore/documentReference/1.0",F._jsonSchema={type:z("string",F._jsonSchemaVersion),referencePath:z("string")};var Ke=class n extends Vn{constructor(e,t,r){super(e,t,function(s){return new ai(s)}(r)),this._path=r,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){let e=this._path.popLast();return e.isEmpty()?null:new F(this.firestore,null,new Y(e))}withConverter(e){return new n(this.firestore,e,this._path)}};function ra(n,e,...t){if(n=P(n),arguments.length===1&&(e=Qr.newId()),Vl("doc","path",e),n instanceof Ce){let r=U.fromString(e,...t);return bo(r),new F(n,null,new Y(r))}{if(!(n instanceof F||n instanceof Ke))throw new w(_.INVALID_ARGUMENT,"Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");let r=n._path.child(U.fromString(e,...t));return bo(r),new F(n.firestore,n instanceof Ke?n.converter:null,new Y(r))}}var ce=class n{constructor(e){this._byteString=e}static fromBase64String(e){try{return new n(Ee.fromBase64String(e))}catch(t){throw new w(_.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new n(Ee.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:n._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(Ot(e,n._jsonSchema))return n.fromBase64String(e.bytes)}};ce._jsonSchemaVersion="firestore/bytes/1.0",ce._jsonSchema={type:z("string",ce._jsonSchemaVersion),bytes:z("string")};var Je=class{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new w(_.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new vt(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}};var Ye=class{constructor(e){this._methodName=e}};var ue=class n{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new w(_.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new w(_.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return Ie(this._lat,e._lat)||Ie(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:n._jsonSchemaVersion}}static fromJSON(e){if(Ot(e,n._jsonSchema))return new n(e.latitude,e.longitude)}};ue._jsonSchemaVersion="firestore/geoPoint/1.0",ue._jsonSchema={type:z("string",ue._jsonSchemaVersion),latitude:z("number"),longitude:z("number")};var ne=class n{constructor(e){this._values=(e||[]).map(t=>t)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(r,i){if(r.length!==i.length)return!1;for(let s=0;s<r.length;++s)if(r[s]!==i[s])return!1;return!0}(this._values,e._values)}toJSON(){return{type:n._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(Ot(e,n._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every(t=>typeof t=="number"))return new n(e.vectorValues);throw new w(_.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}};ne._jsonSchemaVersion="firestore/vectorValue/1.0",ne._jsonSchema={type:z("string",ne._jsonSchemaVersion),vectorValues:z("object")};var Gl=/^__.*__$/,yi=class{constructor(e,t,r){this.data=e,this.fieldMask=t,this.fieldTransforms=r}toMutation(e,t){return this.fieldMask!==null?new St(e,this.data,this.fieldMask,t,this.fieldTransforms):new Dn(e,this.data,t,this.fieldTransforms)}},Mn=class{constructor(e,t,r){this.data=e,this.fieldMask=t,this.fieldTransforms=r}toMutation(e,t){return new St(e,this.data,this.fieldMask,t,this.fieldTransforms)}};function ia(n){switch(n){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw b(40011,{dataSource:n})}}var Ii=class n{constructor(e,t,r,i,s,o){this.settings=e,this.databaseId=t,this.serializer=r,this.ignoreUndefinedProperties=i,s===void 0&&this.validatePath(),this.fieldTransforms=s||[],this.fieldMask=o||[]}get path(){return this.settings.path}get dataSource(){return this.settings.dataSource}contextWith(e){return new n({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}childContextForField(e){let t=this.path?.child(e),r=this.contextWith({path:t,arrayElement:!1});return r.validatePathSegment(e),r}childContextForFieldPath(e){let t=this.path?.child(e),r=this.contextWith({path:t,arrayElement:!1});return r.validatePath(),r}childContextForArray(e){return this.contextWith({path:void 0,arrayElement:!0})}createError(e){return Fn(e,this.settings.methodName,this.settings.hasConverter||!1,this.path,this.settings.targetDoc)}contains(e){return this.fieldMask.find(t=>e.isPrefixOf(t))!==void 0||this.fieldTransforms.find(t=>e.isPrefixOf(t.field))!==void 0}validatePath(){if(this.path)for(let e=0;e<this.path.length;e++)this.validatePathSegment(this.path.get(e))}validatePathSegment(e){if(e.length===0)throw this.createError("Document fields must not be empty");if(ia(this.dataSource)&&Gl.test(e))throw this.createError('Document fields cannot begin and end with "__"')}},Ei=class{constructor(e,t,r){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=r||Ai(e)}createContext(e,t,r,i=!1){return new Ii({dataSource:e,methodName:t,targetDoc:r,path:vt.emptyPath(),arrayElement:!1,hasConverter:i},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}};function sa(n){let e=n._freezeSettings(),t=Ai(n._databaseId);return new Ei(n._databaseId,!!e.ignoreUndefinedProperties,t)}function oa(n,e,t,r,i,s={}){let o=n.createContext(s.merge||s.mergeFields?2:0,e,t,i);Pi("Data must be an object, but it was:",o,r);let a=ua(r,o),h,m;if(s.merge)h=new je(o.fieldMask),m=o.fieldTransforms;else if(s.mergeFields){let y=[];for(let E of s.mergeFields){let T=Nt(e,E,t);if(!o.contains(T))throw new w(_.INVALID_ARGUMENT,`Field '${T}' is specified in your field mask but missing from your input data.`);fa(y,T)||y.push(T)}h=new je(y),m=o.fieldTransforms.filter(E=>h.covers(E.field))}else h=null,m=o.fieldTransforms;return new yi(new j(a),h,m)}var Un=class n extends Ye{_toFieldTransform(e){if(e.dataSource!==2)throw e.dataSource===1?e.createError(`${this._methodName}() can only appear at the top level of your update data`):e.createError(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof n}};function aa(n,e,t,r){let i=n.createContext(1,e,t);Pi("Data must be an object, but it was:",i,r);let s=[],o=j.empty();Dt(r,(h,m)=>{let y=da(e,h,t);m=P(m);let E=i.childContextForFieldPath(y);if(m instanceof Un)s.push(y);else{let T=$n(m,E);T!=null&&(s.push(y),o.set(y,T))}});let a=new je(s);return new Mn(o,a,i.fieldTransforms)}function ca(n,e,t,r,i,s){let o=n.createContext(1,e,t),a=[Nt(e,r,t)],h=[i];if(s.length%2!=0)throw new w(_.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let T=0;T<s.length;T+=2)a.push(Nt(e,s[T])),h.push(s[T+1]);let m=[],y=j.empty();for(let T=a.length-1;T>=0;--T)if(!fa(m,a[T])){let N=a[T],S=h[T];S=P(S);let D=o.childContextForFieldPath(N);if(S instanceof Un)m.push(N);else{let R=$n(S,D);R!=null&&(m.push(N),y.set(N,R))}}let E=new je(m);return new Mn(y,E,o.fieldTransforms)}function $n(n,e,t){if(ha(n=P(n)))return Pi("Unsupported field value:",e,n),ua(n,e);if(n instanceof Ye)return function(i,s){if(!ia(s.dataSource))throw s.createError(`${i._methodName}() can only be used with update() and set()`);if(!s.path)throw s.createError(`${i._methodName}() is not currently supported inside arrays`);let o=i._toFieldTransform(s);o&&s.fieldTransforms.push(o)}(n,e),null;if(n===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),n instanceof Array){if(e.settings.arrayElement&&e.dataSource!==4)throw e.createError("Nested arrays are not supported");return function(i,s){let o=[],a=0;for(let h of i){let m=$n(h,s.childContextForArray(a));m==null&&(m={nullValue:"NULL_VALUE"}),o.push(m),a++}return{arrayValue:{values:o}}}(n,e)}return function(i,s,o){if((i=P(i))===null)return{nullValue:"NULL_VALUE"};if(typeof i=="number")return ql(s.serializer,i);if(typeof i=="boolean")return{booleanValue:i};if(typeof i=="string")return{stringValue:i};if(i instanceof Date){let a=L.fromDate(i);return{timestampValue:Tn(s.serializer,a)}}if(i instanceof L){let a=new L(i.seconds,1e3*Math.floor(i.nanoseconds/1e3));return{timestampValue:Tn(s.serializer,a)}}if(la(i)){let a=L.fromInstant(i),h=new L(a.seconds,1e3*Math.floor(a.nanoseconds/1e3));return{timestampValue:Tn(s.serializer,h)}}if(i instanceof ue)return{geoPointValue:{latitude:i.latitude,longitude:i.longitude}};if(i instanceof ce)return{bytesValue:$l(s.serializer,i._byteString)};if(i instanceof F){let a=s.databaseId,h=i.firestore._databaseId;if(!h.isEqual(a))throw s.createError(`Document reference is for database ${h.projectId}/${h.database} but should be for database ${a.projectId}/${a.database}`);return{referenceValue:Yo(i.firestore._databaseId||s.databaseId,i._key.path)}}if(i instanceof ne)return function(h,m){let y=h instanceof ne?h.toArray():h;return{mapValue:{fields:{[zo]:{stringValue:Go},[Ko]:{arrayValue:{values:y.map(T=>{if(typeof T!="number")throw m.createError("VectorValues must only contain numeric values.");return Jo(m.serializer,T)})}}}}}}(i,s);if(Xo(i))return i._toProto(s.serializer);throw s.createError(`Unsupported field value: ${vi(i)}`)}(n,e)}function ua(n,e){let t={};return function(i){for(let s in i)if(Object.prototype.hasOwnProperty.call(i,s))return!1;return!0}(n)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):Dt(n,(r,i)=>{let s=$n(i,e.childContextForField(r));s!=null&&(t[r]=s)}),{mapValue:{fields:t}}}function la(n){if(typeof n!="object"||n===null)return!1;if(typeof Temporal<"u"&&typeof Temporal.Instant=="function"&&n instanceof Temporal.Instant)return!0;let e=n;return e[Symbol.toStringTag]==="Temporal.Instant"&&typeof e.Te=="bigint"}function ha(n){return!(typeof n!="object"||n===null||n instanceof Array||n instanceof Date||n instanceof L||n instanceof ue||n instanceof ce||n instanceof F||n instanceof Ye||n instanceof ne||la(n)||Xo(n))}function Pi(n,e,t){if(!ha(t)||!qo(t)){let r=vi(t);throw r==="an object"?e.createError(n+" a custom object"):e.createError(n+" "+r)}}function Nt(n,e,t){if((e=P(e))instanceof Je)return e._internalPath;if(typeof e=="string")return da(n,e);throw Fn("Field path arguments must be of type string or ",n,!1,void 0,t)}var Kl=new RegExp("[~\\*/\\[\\]]");function da(n,e,t){if(e.search(Kl)>=0)throw Fn(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,n,!1,void 0,t);try{return new Je(...e.split("."))._internalPath}catch{throw Fn(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,n,!1,void 0,t)}}function Fn(n,e,t,r,i){let s=r&&!r.isEmpty(),o=i!==void 0,a=`Function ${e}() called with invalid data`;t&&(a+=" (via `toFirestore()`)"),a+=". ";let h="";return(s||o)&&(h+=" (found",s&&(h+=` in field ${r}`),o&&(h+=` in document ${i}`),h+=")"),new w(_.INVALID_ARGUMENT,a+n+h)}function fa(n,e){return n.some(t=>t.isEqual(e))}var De=class{constructor(e,t,r,i,s){this._firestore=e,this._userDataWriter=t,this._key=r,this._document=i,this._converter=s}get id(){return this._key.path.lastSegment()}get ref(){return new F(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){let e=new xn(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}_fieldsProto(){return this._document?.data.clone().value.mapValue.fields??void 0}get(e){if(this._document){let t=this._document.data.field(Nt("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}},xn=class extends De{data(){return super.data()}};var wi=class{convertValue(e,t="none"){switch(ri(e)){case 0:return null;case 1:return e.booleanValue;case 2:return q(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(ti(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw b(62114,{value:e})}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){let r={};return Dt(e,(i,s)=>{r[i]=this.convertValue(s,t)}),r}convertVectorValue(e){let t=e.fields?.[Ko].arrayValue?.values?.map(r=>q(r.doubleValue));return new ne(t)}convertGeoPoint(e){return new ue(q(e.latitude),q(e.longitude))}convertArray(e,t){return(e.values||[]).map(r=>this.convertValue(r,t))}convertServerTimestamp(e,t){switch(t){case"previous":let r=jo(e);return r==null?null:this.convertValue(r,t);case"estimate":return this.convertTimestamp(ni(e));default:return null}}convertTimestamp(e){let t=At(e);return new L(t.seconds,t.nanos)}convertDocumentKey(e,t){let r=U.fromString(e);B(Qo(r),9688,{name:e});let i=new Rn(r.get(1),r.get(3)),s=new Y(r.popFirst(5));return i.isEqual(t)||Ct(`A document reference to ${s} refers to a different database (${i.projectId}/${i.database}), which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),s}};function pa(n,e,t){let r;return r=n?t&&(t.merge||t.mergeFields)?n.toFirestore(e,t):n.toFirestore(e):e,r}var kt=class extends wi{constructor(e){super(),this.firestore=e}convertBytes(e){return new ce(e)}convertReference(e){let t=this.convertDocumentKey(e,this.firestore._databaseId);return new F(this.firestore,null,t)}};function ma(n){let e=Si((n=qn(n,F)).firestore),t=new kt(n.firestore);return bi(e,[n._key]).then(r=>{B(r.length===1,15618);let i=r[0];return new De(n.firestore,t,n._key,i.isFoundDocument()?i:null,n.converter)})}var ga="4.17.2";var Lt=class{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}};var Wn=class{constructor(e,t,r=1e3,i=1.5,s=6e4){this.t=e,this.timerId=t,this.i=r,this.o=i,this.h=s,this.u=0,this.l=null,this._=Date.now(),this.reset()}reset(){this.u=0}m(){this.u=this.h}A(e){this.cancel();let t=Math.floor(this.u+this.p()),r=Math.max(0,Date.now()-this._),i=Math.max(0,t-r);i>0&&ye("ExponentialBackoff",`Backing off for ${i} ms (base delay: ${this.u} ms, delay with jitter: ${t} ms, last attempt: ${r} ms ago)`),this.l=this.t.enqueueAfterDelay(this.timerId,i,()=>(this._=Date.now(),e())),this.u*=this.o,this.u<this.i&&(this.u=this.i),this.u>this.h&&(this.u=this.h)}T(){this.l!==null&&(this.l.skipDelay(),this.l=null)}cancel(){this.l!==null&&(this.l.cancel(),this.l=null)}p(){return(Math.random()-.5)*this.u}};function Bn(n,e){if((n=P(n)).firestore!==e)throw new w(_.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return n}var Jl=class{constructor(e){this.datastore=e,this.readVersions=new Map,this.mutations=[],this.committed=!1,this.lastTransactionError=null,this.writtenDocs=new Set}async lookup(e){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw this.lastTransactionError=new w(_.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes."),this.lastTransactionError;let t=await bi(this.datastore,e);return t.forEach(r=>this.recordVersion(r)),t}set(e,t){this.write(t.toMutation(e,this.precondition(e))),this.writtenDocs.add(e.toString())}update(e,t){try{this.write(t.toMutation(e,this.preconditionForUpdate(e)))}catch(r){this.lastTransactionError=r}this.writtenDocs.add(e.toString())}delete(e){this.write(new Rt(e,this.precondition(e))),this.writtenDocs.add(e.toString())}async commit(){if(this.ensureCommitNotCalled(),this.lastTransactionError)throw this.lastTransactionError;let e=this.readVersions;this.mutations.forEach(t=>{e.delete(t.key.toString())}),e.forEach((t,r)=>{let i=Y.fromPath(r);this.mutations.push(new Pt(i,this.precondition(i)))}),await Zo(this.datastore,this.mutations),this.committed=!0}recordVersion(e){let t;if(e.isFoundDocument())t=e.version;else{if(!e.isNoDocument())throw b(50498,{R:e.constructor.name});t=C.min()}let r=this.readVersions.get(e.key.toString());if(r){if(!t.isEqual(r))throw new w(_.ABORTED,"Document version changed between two reads.")}else this.readVersions.set(e.key.toString(),t)}precondition(e){let t=this.readVersions.get(e.toString());return!this.writtenDocs.has(e.toString())&&t?t.isEqual(C.min())?we.exists(!1):we.updateTime(t):we.none()}preconditionForUpdate(e){let t=this.readVersions.get(e.toString());if(!this.writtenDocs.has(e.toString())&&t){if(t.isEqual(C.min()))throw new w(_.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return we.updateTime(t)}return we.exists(!0)}write(e){this.ensureCommitNotCalled(),this.mutations.push(e)}ensureCommitNotCalled(){}};var Yl={maxAttempts:5};var ki=class{constructor(e,t,r,i,s){this.asyncQueue=e,this.datastore=t,this.options=r,this.updateFunction=i,this.deferred=s,this.I=r.maxAttempts,this.P=new Wn(this.asyncQueue,"transaction_retry")}V(){this.I-=1,this.D()}D(){this.P.A(async()=>{let e=new Jl(this.datastore),t=this.v(e);t&&t.then(r=>{this.asyncQueue.enqueueAndForget(()=>e.commit().then(()=>{this.deferred.resolve(r)}).catch(i=>{this.F(i)}))}).catch(r=>{this.F(r)})})}v(e){try{let t=this.updateFunction(e);return!Bo(t)&&t.catch&&t.then?t:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(t){return this.deferred.reject(t),null}}F(e){this.I>0&&this.B(e)?(this.I-=1,this.asyncQueue.enqueueAndForget(()=>(this.D(),Promise.resolve()))):this.deferred.reject(e)}B(e){if(e?.name==="FirebaseError"){let t=e.code;return t==="aborted"||t==="failed-precondition"||t==="already-exists"||!Wo(t)}return!1}};function Ni(){return typeof document<"u"?document:null}var Ci=class n{constructor(e,t,r,i,s){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=r,this.op=i,this.removalCallback=s,this.deferred=new Lt,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,t,r,i,s){let o=Date.now()+r,a=new n(e,t,o,i,s);return a.start(r),a}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new w(_.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}};var _a="AsyncQueue",Di=class{constructor(e=Promise.resolve()){this.k=[],this.O=!1,this.S=[],this.q=null,this.C=!1,this.M=!1,this.N=[],this.P=new Wn(this,"async_queue_retry"),this.L=()=>{let r=Ni();r&&ye(_a,"Visibility state changed to "+r.visibilityState),this.P.T()},this.W=e;let t=Ni();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this.L)}get isShuttingDown(){return this.O}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.U(),this.j(e)}enterRestrictedMode(e){if(!this.O){this.O=!0,this.M=e||!1;let t=Ni();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this.L)}}enqueue(e){if(this.U(),this.O)return new Promise(()=>{});let t=new Lt;return this.j(()=>this.O&&this.M?Promise.resolve():(e().then(t.resolve,t.reject),t.promise)).then(()=>t.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.k.push(e),this.$()))}async $(){if(this.k.length!==0){try{await this.k[0](),this.k.shift(),this.P.reset()}catch(e){if(!function(r){return r.name==="IndexedDbTransactionError"}(e))throw e;ye(_a,"Operation failed with retryable error: "+e)}this.k.length>0&&this.P.A(()=>this.$())}}j(e){let t=this.W.then(()=>(this.C=!0,e().catch(r=>{this.q=r,this.C=!1;let i=ya(r);throw Ct("INTERNAL UNHANDLED ERROR: ",i),r}).then(r=>(this.C=!1,r))));return this.W=t,t}enqueueAfterDelay(e,t,r){this.U(),this.N.indexOf(e)>-1&&(t=0);let i=Ci.createAndSchedule(this,e,t,r,s=>this.G(s));return this.S.push(i),i}U(){this.q&&b(47125,{H:ya(this.q)})}verifyOperationInProgress(){}async J(){let e;do e=this.W,await e;while(e!==this.W)}K(e){for(let t of this.S)if(t.timerId===e)return!0;return!1}X(e){return this.J().then(()=>{this.S.sort((t,r)=>t.targetTimeMs-r.targetTimeMs);for(let t of this.S)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.J()})}Y(e){this.N.push(e)}G(e){let t=this.S.indexOf(e);this.S.splice(t,1)}};function ya(n){let e=n.message||"";return n.stack&&(e=n.stack.includes(n.message)?n.stack:n.message+`
`+n.stack),e}var Oi=class{constructor(e,t){this._firestore=e,this._transaction=t,this._dataReader=sa(e)}get(e){let t=Bn(e,this._firestore),r=new kt(this._firestore);return this._transaction.lookup([t._key]).then(i=>{if(!i||i.length!==1)return b(24041);let s=i[0];if(s.isFoundDocument())return new De(this._firestore,r,s.key,s,t.converter);if(s.isNoDocument())return new De(this._firestore,r,t._key,null,t.converter);throw b(18433,{doc:s})})}set(e,t,r){let i=Bn(e,this._firestore),s=pa(i.converter,t,r),o=oa(this._dataReader,"Transaction.set",i._key,s,i.converter!==null,r);return this._transaction.set(i._key,o),this}update(e,t,r,...i){let s=Bn(e,this._firestore),o;return o=typeof(t=P(t))=="string"||t instanceof Je?ca(this._dataReader,"Transaction.update",s._key,t,r,i):aa(this._dataReader,"Transaction.update",s._key,t),this._transaction.update(s._key,o),this}delete(e){let t=Bn(e,this._firestore);return this._transaction.delete(t._key),this}};function Ql(n,e,t){n=qn(n,Ce);let r=Si(n),i={...Yl,...t};(function(a){if(a.maxAttempts<1)throw new w(_.INVALID_ARGUMENT,"Max attempts must be at least 1")})(i);let s=new Lt;return new ki(function(){return new Di}(),r,i,o=>e(new Oi(n,o)),s).V(),s.promise}(function(){Lo(`${fe}_lite`),de(new W("firestore/lite",(e,{instanceIdentifier:t,options:r})=>{let i=e.getProvider("app").getImmediate(),s=new Ce(new An(e.getProvider("auth-internal")),new Sn(i,e.getProvider("app-check-internal")),Fo(i,t),i);return r&&s._setSettings(r),s},"PUBLIC").setMultipleInstances(!0)),K("firestore-lite",ga,""),K("firestore-lite",ga,"esm2020")})();export{_e as EmailAuthProvider,$e as GoogleAuthProvider,Ur as connectAuthEmulator,Ri as connectFirestoreEmulator,ra as doc,wo as getAuth,ma as getDoc,na as getFirestore,us as initializeApp,ro as linkWithCredential,co as onAuthStateChanged,Ql as runTransaction,io as sendPasswordResetEmail,so as signInWithEmailAndPassword,yo as signInWithPopup,uo as signOut};
/*! Bundled license information:

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/component/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/logger/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm/index-4NFEPWkC.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/webchannel-wrapper/dist/bloom-blob/esm/bloom_blob_es2018.js:
  (** @license
  Copyright The Closure Library Authors.
  SPDX-License-Identifier: Apache-2.0
  *)
  (** @license
  
   Copyright The Closure Library Authors.
   SPDX-License-Identifier: Apache-2.0
  *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2018 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2024 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
  * @license
  * Copyright 2017 Google LLC
  *
  * Licensed under the Apache License, Version 2.0 (the "License");
  * you may not use this file except in compliance with the License.
  * You may obtain a copy of the License at
  *
  *   http://www.apache.org/licenses/LICENSE-2.0
  *
  * Unless required by applicable law or agreed to in writing, software
  * distributed under the License is distributed on an "AS IS" BASIS,
  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  * See the License for the specific language governing permissions and
  * limitations under the License.
  *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/common-B8fiiKst.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/index.browser.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/index.browser.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/index.browser.esm.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/index.browser.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/firestore/dist/lite/index.browser.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/

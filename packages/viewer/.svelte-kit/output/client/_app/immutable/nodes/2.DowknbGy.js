var Nc=Object.defineProperty;var Oc=(n,e,t)=>e in n?Nc(n,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[e]=t;var Zi=(n,e,t)=>Oc(n,typeof e!="symbol"?e+"":e,t);import{a as Fc,f as Bc}from"../chunks/_r6saDAo.js";import{o as zc,a as kc}from"../chunks/3q_Q3XbO.js";import{o as Gc,aA as na,am as Hc,t as Vc,q as Wc,J as Un,v as Gr,x as ia,w as Hr,an as ra}from"../chunks/BU0DZgG9.js";import{s as Xc}from"../chunks/BeGXTDLn.js";import{b as qc}from"../chunks/B3CsZdTR.js";var Ze;(function(n){n.assertEqual=r=>{};function e(r){}n.assertIs=e;function t(r){throw new Error}n.assertNever=t,n.arrayToEnum=r=>{const s={};for(const o of r)s[o]=o;return s},n.getValidEnumValues=r=>{const s=n.objectKeys(r).filter(a=>typeof r[r[a]]!="number"),o={};for(const a of s)o[a]=r[a];return n.objectValues(o)},n.objectValues=r=>n.objectKeys(r).map(function(s){return r[s]}),n.objectKeys=typeof Object.keys=="function"?r=>Object.keys(r):r=>{const s=[];for(const o in r)Object.prototype.hasOwnProperty.call(r,o)&&s.push(o);return s},n.find=(r,s)=>{for(const o of r)if(s(o))return o},n.isInteger=typeof Number.isInteger=="function"?r=>Number.isInteger(r):r=>typeof r=="number"&&Number.isFinite(r)&&Math.floor(r)===r;function i(r,s=" | "){return r.map(o=>typeof o=="string"?`'${o}'`:o).join(s)}n.joinValues=i,n.jsonStringifyReplacer=(r,s)=>typeof s=="bigint"?s.toString():s})(Ze||(Ze={}));var sa;(function(n){n.mergeShapes=(e,t)=>({...e,...t})})(sa||(sa={}));const de=Ze.arrayToEnum(["string","nan","number","integer","float","boolean","date","bigint","symbol","function","undefined","null","array","object","unknown","promise","void","never","map","set"]),En=n=>{switch(typeof n){case"undefined":return de.undefined;case"string":return de.string;case"number":return Number.isNaN(n)?de.nan:de.number;case"boolean":return de.boolean;case"function":return de.function;case"bigint":return de.bigint;case"symbol":return de.symbol;case"object":return Array.isArray(n)?de.array:n===null?de.null:n.then&&typeof n.then=="function"&&n.catch&&typeof n.catch=="function"?de.promise:typeof Map<"u"&&n instanceof Map?de.map:typeof Set<"u"&&n instanceof Set?de.set:typeof Date<"u"&&n instanceof Date?de.date:de.object;default:return de.unknown}},J=Ze.arrayToEnum(["invalid_type","invalid_literal","custom","invalid_union","invalid_union_discriminator","invalid_enum_value","unrecognized_keys","invalid_arguments","invalid_return_type","invalid_date","invalid_string","too_small","too_big","invalid_intersection_types","not_multiple_of","not_finite"]);class pn extends Error{get errors(){return this.issues}constructor(e){super(),this.issues=[],this.addIssue=i=>{this.issues=[...this.issues,i]},this.addIssues=(i=[])=>{this.issues=[...this.issues,...i]};const t=new.target.prototype;Object.setPrototypeOf?Object.setPrototypeOf(this,t):this.__proto__=t,this.name="ZodError",this.issues=e}format(e){const t=e||function(s){return s.message},i={_errors:[]},r=s=>{for(const o of s.issues)if(o.code==="invalid_union")o.unionErrors.map(r);else if(o.code==="invalid_return_type")r(o.returnTypeError);else if(o.code==="invalid_arguments")r(o.argumentsError);else if(o.path.length===0)i._errors.push(t(o));else{let a=i,c=0;for(;c<o.path.length;){const l=o.path[c];c===o.path.length-1?(a[l]=a[l]||{_errors:[]},a[l]._errors.push(t(o))):a[l]=a[l]||{_errors:[]},a=a[l],c++}}};return r(this),i}static assert(e){if(!(e instanceof pn))throw new Error(`Not a ZodError: ${e}`)}toString(){return this.message}get message(){return JSON.stringify(this.issues,Ze.jsonStringifyReplacer,2)}get isEmpty(){return this.issues.length===0}flatten(e=t=>t.message){const t={},i=[];for(const r of this.issues)if(r.path.length>0){const s=r.path[0];t[s]=t[s]||[],t[s].push(e(r))}else i.push(e(r));return{formErrors:i,fieldErrors:t}}get formErrors(){return this.flatten()}}pn.create=n=>new pn(n);const Es=(n,e)=>{let t;switch(n.code){case J.invalid_type:n.received===de.undefined?t="Required":t=`Expected ${n.expected}, received ${n.received}`;break;case J.invalid_literal:t=`Invalid literal value, expected ${JSON.stringify(n.expected,Ze.jsonStringifyReplacer)}`;break;case J.unrecognized_keys:t=`Unrecognized key(s) in object: ${Ze.joinValues(n.keys,", ")}`;break;case J.invalid_union:t="Invalid input";break;case J.invalid_union_discriminator:t=`Invalid discriminator value. Expected ${Ze.joinValues(n.options)}`;break;case J.invalid_enum_value:t=`Invalid enum value. Expected ${Ze.joinValues(n.options)}, received '${n.received}'`;break;case J.invalid_arguments:t="Invalid function arguments";break;case J.invalid_return_type:t="Invalid function return type";break;case J.invalid_date:t="Invalid date";break;case J.invalid_string:typeof n.validation=="object"?"includes"in n.validation?(t=`Invalid input: must include "${n.validation.includes}"`,typeof n.validation.position=="number"&&(t=`${t} at one or more positions greater than or equal to ${n.validation.position}`)):"startsWith"in n.validation?t=`Invalid input: must start with "${n.validation.startsWith}"`:"endsWith"in n.validation?t=`Invalid input: must end with "${n.validation.endsWith}"`:Ze.assertNever(n.validation):n.validation!=="regex"?t=`Invalid ${n.validation}`:t="Invalid";break;case J.too_small:n.type==="array"?t=`Array must contain ${n.exact?"exactly":n.inclusive?"at least":"more than"} ${n.minimum} element(s)`:n.type==="string"?t=`String must contain ${n.exact?"exactly":n.inclusive?"at least":"over"} ${n.minimum} character(s)`:n.type==="number"?t=`Number must be ${n.exact?"exactly equal to ":n.inclusive?"greater than or equal to ":"greater than "}${n.minimum}`:n.type==="bigint"?t=`Number must be ${n.exact?"exactly equal to ":n.inclusive?"greater than or equal to ":"greater than "}${n.minimum}`:n.type==="date"?t=`Date must be ${n.exact?"exactly equal to ":n.inclusive?"greater than or equal to ":"greater than "}${new Date(Number(n.minimum))}`:t="Invalid input";break;case J.too_big:n.type==="array"?t=`Array must contain ${n.exact?"exactly":n.inclusive?"at most":"less than"} ${n.maximum} element(s)`:n.type==="string"?t=`String must contain ${n.exact?"exactly":n.inclusive?"at most":"under"} ${n.maximum} character(s)`:n.type==="number"?t=`Number must be ${n.exact?"exactly":n.inclusive?"less than or equal to":"less than"} ${n.maximum}`:n.type==="bigint"?t=`BigInt must be ${n.exact?"exactly":n.inclusive?"less than or equal to":"less than"} ${n.maximum}`:n.type==="date"?t=`Date must be ${n.exact?"exactly":n.inclusive?"smaller than or equal to":"smaller than"} ${new Date(Number(n.maximum))}`:t="Invalid input";break;case J.custom:t="Invalid input";break;case J.invalid_intersection_types:t="Intersection results could not be merged";break;case J.not_multiple_of:t=`Number must be a multiple of ${n.multipleOf}`;break;case J.not_finite:t="Number must be finite";break;default:t=e.defaultError,Ze.assertNever(n)}return{message:t}};let Yc=Es;function Zc(){return Yc}const jc=n=>{const{data:e,path:t,errorMaps:i,issueData:r}=n,s=[...t,...r.path||[]],o={...r,path:s};if(r.message!==void 0)return{...r,path:s,message:r.message};let a="";const c=i.filter(l=>!!l).slice().reverse();for(const l of c)a=l(o,{data:e,defaultError:a}).message;return{...r,path:s,message:a}};function ae(n,e){const t=Zc(),i=jc({issueData:e,data:n.data,path:n.path,errorMaps:[n.common.contextualErrorMap,n.schemaErrorMap,t,t===Es?void 0:Es].filter(r=>!!r)});n.common.issues.push(i)}class zt{constructor(){this.value="valid"}dirty(){this.value==="valid"&&(this.value="dirty")}abort(){this.value!=="aborted"&&(this.value="aborted")}static mergeArray(e,t){const i=[];for(const r of t){if(r.status==="aborted")return we;r.status==="dirty"&&e.dirty(),i.push(r.value)}return{status:e.value,value:i}}static async mergeObjectAsync(e,t){const i=[];for(const r of t){const s=await r.key,o=await r.value;i.push({key:s,value:o})}return zt.mergeObjectSync(e,i)}static mergeObjectSync(e,t){const i={};for(const r of t){const{key:s,value:o}=r;if(s.status==="aborted"||o.status==="aborted")return we;s.status==="dirty"&&e.dirty(),o.status==="dirty"&&e.dirty(),s.value!=="__proto__"&&(typeof o.value<"u"||r.alwaysSet)&&(i[s.value]=o.value)}return{status:e.value,value:i}}}const we=Object.freeze({status:"aborted"}),Ni=n=>({status:"dirty",value:n}),Vt=n=>({status:"valid",value:n}),aa=n=>n.status==="aborted",oa=n=>n.status==="dirty",xi=n=>n.status==="valid",vr=n=>typeof Promise<"u"&&n instanceof Promise;var pe;(function(n){n.errToObj=e=>typeof e=="string"?{message:e}:e||{},n.toString=e=>typeof e=="string"?e:e==null?void 0:e.message})(pe||(pe={}));class Rn{constructor(e,t,i,r){this._cachedPath=[],this.parent=e,this.data=t,this._path=i,this._key=r}get path(){return this._cachedPath.length||(Array.isArray(this._key)?this._cachedPath.push(...this._path,...this._key):this._cachedPath.push(...this._path,this._key)),this._cachedPath}}const ca=(n,e)=>{if(xi(e))return{success:!0,data:e.value};if(!n.common.issues.length)throw new Error("Validation failed but no issues detected.");return{success:!1,get error(){if(this._error)return this._error;const t=new pn(n.common.issues);return this._error=t,this._error}}};function Ge(n){if(!n)return{};const{errorMap:e,invalid_type_error:t,required_error:i,description:r}=n;if(e&&(t||i))throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);return e?{errorMap:e,description:r}:{errorMap:(o,a)=>{const{message:c}=n;return o.code==="invalid_enum_value"?{message:c??a.defaultError}:typeof a.data>"u"?{message:c??i??a.defaultError}:o.code!=="invalid_type"?{message:a.defaultError}:{message:c??t??a.defaultError}},description:r}}class qe{get description(){return this._def.description}_getType(e){return En(e.data)}_getOrReturnCtx(e,t){return t||{common:e.parent.common,data:e.data,parsedType:En(e.data),schemaErrorMap:this._def.errorMap,path:e.path,parent:e.parent}}_processInputParams(e){return{status:new zt,ctx:{common:e.parent.common,data:e.data,parsedType:En(e.data),schemaErrorMap:this._def.errorMap,path:e.path,parent:e.parent}}}_parseSync(e){const t=this._parse(e);if(vr(t))throw new Error("Synchronous parse encountered promise.");return t}_parseAsync(e){const t=this._parse(e);return Promise.resolve(t)}parse(e,t){const i=this.safeParse(e,t);if(i.success)return i.data;throw i.error}safeParse(e,t){const i={common:{issues:[],async:(t==null?void 0:t.async)??!1,contextualErrorMap:t==null?void 0:t.errorMap},path:(t==null?void 0:t.path)||[],schemaErrorMap:this._def.errorMap,parent:null,data:e,parsedType:En(e)},r=this._parseSync({data:e,path:i.path,parent:i});return ca(i,r)}"~validate"(e){var i,r;const t={common:{issues:[],async:!!this["~standard"].async},path:[],schemaErrorMap:this._def.errorMap,parent:null,data:e,parsedType:En(e)};if(!this["~standard"].async)try{const s=this._parseSync({data:e,path:[],parent:t});return xi(s)?{value:s.value}:{issues:t.common.issues}}catch(s){(r=(i=s==null?void 0:s.message)==null?void 0:i.toLowerCase())!=null&&r.includes("encountered")&&(this["~standard"].async=!0),t.common={issues:[],async:!0}}return this._parseAsync({data:e,path:[],parent:t}).then(s=>xi(s)?{value:s.value}:{issues:t.common.issues})}async parseAsync(e,t){const i=await this.safeParseAsync(e,t);if(i.success)return i.data;throw i.error}async safeParseAsync(e,t){const i={common:{issues:[],contextualErrorMap:t==null?void 0:t.errorMap,async:!0},path:(t==null?void 0:t.path)||[],schemaErrorMap:this._def.errorMap,parent:null,data:e,parsedType:En(e)},r=this._parse({data:e,path:i.path,parent:i}),s=await(vr(r)?r:Promise.resolve(r));return ca(i,s)}refine(e,t){const i=r=>typeof t=="string"||typeof t>"u"?{message:t}:typeof t=="function"?t(r):t;return this._refinement((r,s)=>{const o=e(r),a=()=>s.addIssue({code:J.custom,...i(r)});return typeof Promise<"u"&&o instanceof Promise?o.then(c=>c?!0:(a(),!1)):o?!0:(a(),!1)})}refinement(e,t){return this._refinement((i,r)=>e(i)?!0:(r.addIssue(typeof t=="function"?t(i,r):t),!1))}_refinement(e){return new Zn({schema:this,typeName:Ce.ZodEffects,effect:{type:"refinement",refinement:e}})}superRefine(e){return this._refinement(e)}constructor(e){this.spa=this.safeParseAsync,this._def=e,this.parse=this.parse.bind(this),this.safeParse=this.safeParse.bind(this),this.parseAsync=this.parseAsync.bind(this),this.safeParseAsync=this.safeParseAsync.bind(this),this.spa=this.spa.bind(this),this.refine=this.refine.bind(this),this.refinement=this.refinement.bind(this),this.superRefine=this.superRefine.bind(this),this.optional=this.optional.bind(this),this.nullable=this.nullable.bind(this),this.nullish=this.nullish.bind(this),this.array=this.array.bind(this),this.promise=this.promise.bind(this),this.or=this.or.bind(this),this.and=this.and.bind(this),this.transform=this.transform.bind(this),this.brand=this.brand.bind(this),this.default=this.default.bind(this),this.catch=this.catch.bind(this),this.describe=this.describe.bind(this),this.pipe=this.pipe.bind(this),this.readonly=this.readonly.bind(this),this.isNullable=this.isNullable.bind(this),this.isOptional=this.isOptional.bind(this),this["~standard"]={version:1,vendor:"zod",validate:t=>this["~validate"](t)}}optional(){return hn.create(this,this._def)}nullable(){return jn.create(this,this._def)}nullish(){return this.nullable().optional()}array(){return Kt.create(this)}promise(){return Er.create(this,this._def)}or(e){return Mr.create([this,e],this._def)}and(e){return Sr.create(this,e,this._def)}transform(e){return new Zn({...Ge(this._def),schema:this,typeName:Ce.ZodEffects,effect:{type:"transform",transform:e}})}default(e){const t=typeof e=="function"?e:()=>e;return new Tr({...Ge(this._def),innerType:this,defaultValue:t,typeName:Ce.ZodDefault})}brand(){return new Vo({typeName:Ce.ZodBranded,type:this,...Ge(this._def)})}catch(e){const t=typeof e=="function"?e:()=>e;return new br({...Ge(this._def),innerType:this,catchValue:t,typeName:Ce.ZodCatch})}describe(e){const t=this.constructor;return new t({...this._def,description:e})}pipe(e){return Gs.create(this,e)}readonly(){return Ar.create(this)}isOptional(){return this.safeParse(void 0).success}isNullable(){return this.safeParse(null).success}}const $c=/^c[^\s-]{8,}$/i,Kc=/^[0-9a-z]+$/,Jc=/^[0-9A-HJKMNP-TV-Z]{26}$/i,Qc=/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i,el=/^[a-z0-9_-]{21}$/i,tl=/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,nl=/^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,il=/^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i,rl="^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";let Vr;const sl=/^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,al=/^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,ol=/^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,cl=/^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,ll=/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,ul=/^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,ko="((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))",dl=new RegExp(`^${ko}$`);function Go(n){let e="[0-5]\\d";n.precision?e=`${e}\\.\\d{${n.precision}}`:n.precision==null&&(e=`${e}(\\.\\d+)?`);const t=n.precision?"+":"?";return`([01]\\d|2[0-3]):[0-5]\\d(:${e})${t}`}function hl(n){return new RegExp(`^${Go(n)}$`)}function fl(n){let e=`${ko}T${Go(n)}`;const t=[];return t.push(n.local?"Z?":"Z"),n.offset&&t.push("([+-]\\d{2}:?\\d{2})"),e=`${e}(${t.join("|")})`,new RegExp(`^${e}$`)}function pl(n,e){return!!((e==="v4"||!e)&&sl.test(n)||(e==="v6"||!e)&&ol.test(n))}function ml(n,e){if(!tl.test(n))return!1;try{const[t]=n.split(".");if(!t)return!1;const i=t.replace(/-/g,"+").replace(/_/g,"/").padEnd(t.length+(4-t.length%4)%4,"="),r=JSON.parse(atob(i));return!(typeof r!="object"||r===null||"typ"in r&&(r==null?void 0:r.typ)!=="JWT"||!r.alg||e&&r.alg!==e)}catch{return!1}}function _l(n,e){return!!((e==="v4"||!e)&&al.test(n)||(e==="v6"||!e)&&cl.test(n))}class Tn extends qe{_parse(e){if(this._def.coerce&&(e.data=String(e.data)),this._getType(e)!==de.string){const s=this._getOrReturnCtx(e);return ae(s,{code:J.invalid_type,expected:de.string,received:s.parsedType}),we}const i=new zt;let r;for(const s of this._def.checks)if(s.kind==="min")e.data.length<s.value&&(r=this._getOrReturnCtx(e,r),ae(r,{code:J.too_small,minimum:s.value,type:"string",inclusive:!0,exact:!1,message:s.message}),i.dirty());else if(s.kind==="max")e.data.length>s.value&&(r=this._getOrReturnCtx(e,r),ae(r,{code:J.too_big,maximum:s.value,type:"string",inclusive:!0,exact:!1,message:s.message}),i.dirty());else if(s.kind==="length"){const o=e.data.length>s.value,a=e.data.length<s.value;(o||a)&&(r=this._getOrReturnCtx(e,r),o?ae(r,{code:J.too_big,maximum:s.value,type:"string",inclusive:!0,exact:!0,message:s.message}):a&&ae(r,{code:J.too_small,minimum:s.value,type:"string",inclusive:!0,exact:!0,message:s.message}),i.dirty())}else if(s.kind==="email")il.test(e.data)||(r=this._getOrReturnCtx(e,r),ae(r,{validation:"email",code:J.invalid_string,message:s.message}),i.dirty());else if(s.kind==="emoji")Vr||(Vr=new RegExp(rl,"u")),Vr.test(e.data)||(r=this._getOrReturnCtx(e,r),ae(r,{validation:"emoji",code:J.invalid_string,message:s.message}),i.dirty());else if(s.kind==="uuid")Qc.test(e.data)||(r=this._getOrReturnCtx(e,r),ae(r,{validation:"uuid",code:J.invalid_string,message:s.message}),i.dirty());else if(s.kind==="nanoid")el.test(e.data)||(r=this._getOrReturnCtx(e,r),ae(r,{validation:"nanoid",code:J.invalid_string,message:s.message}),i.dirty());else if(s.kind==="cuid")$c.test(e.data)||(r=this._getOrReturnCtx(e,r),ae(r,{validation:"cuid",code:J.invalid_string,message:s.message}),i.dirty());else if(s.kind==="cuid2")Kc.test(e.data)||(r=this._getOrReturnCtx(e,r),ae(r,{validation:"cuid2",code:J.invalid_string,message:s.message}),i.dirty());else if(s.kind==="ulid")Jc.test(e.data)||(r=this._getOrReturnCtx(e,r),ae(r,{validation:"ulid",code:J.invalid_string,message:s.message}),i.dirty());else if(s.kind==="url")try{new URL(e.data)}catch{r=this._getOrReturnCtx(e,r),ae(r,{validation:"url",code:J.invalid_string,message:s.message}),i.dirty()}else s.kind==="regex"?(s.regex.lastIndex=0,s.regex.test(e.data)||(r=this._getOrReturnCtx(e,r),ae(r,{validation:"regex",code:J.invalid_string,message:s.message}),i.dirty())):s.kind==="trim"?e.data=e.data.trim():s.kind==="includes"?e.data.includes(s.value,s.position)||(r=this._getOrReturnCtx(e,r),ae(r,{code:J.invalid_string,validation:{includes:s.value,position:s.position},message:s.message}),i.dirty()):s.kind==="toLowerCase"?e.data=e.data.toLowerCase():s.kind==="toUpperCase"?e.data=e.data.toUpperCase():s.kind==="startsWith"?e.data.startsWith(s.value)||(r=this._getOrReturnCtx(e,r),ae(r,{code:J.invalid_string,validation:{startsWith:s.value},message:s.message}),i.dirty()):s.kind==="endsWith"?e.data.endsWith(s.value)||(r=this._getOrReturnCtx(e,r),ae(r,{code:J.invalid_string,validation:{endsWith:s.value},message:s.message}),i.dirty()):s.kind==="datetime"?fl(s).test(e.data)||(r=this._getOrReturnCtx(e,r),ae(r,{code:J.invalid_string,validation:"datetime",message:s.message}),i.dirty()):s.kind==="date"?dl.test(e.data)||(r=this._getOrReturnCtx(e,r),ae(r,{code:J.invalid_string,validation:"date",message:s.message}),i.dirty()):s.kind==="time"?hl(s).test(e.data)||(r=this._getOrReturnCtx(e,r),ae(r,{code:J.invalid_string,validation:"time",message:s.message}),i.dirty()):s.kind==="duration"?nl.test(e.data)||(r=this._getOrReturnCtx(e,r),ae(r,{validation:"duration",code:J.invalid_string,message:s.message}),i.dirty()):s.kind==="ip"?pl(e.data,s.version)||(r=this._getOrReturnCtx(e,r),ae(r,{validation:"ip",code:J.invalid_string,message:s.message}),i.dirty()):s.kind==="jwt"?ml(e.data,s.alg)||(r=this._getOrReturnCtx(e,r),ae(r,{validation:"jwt",code:J.invalid_string,message:s.message}),i.dirty()):s.kind==="cidr"?_l(e.data,s.version)||(r=this._getOrReturnCtx(e,r),ae(r,{validation:"cidr",code:J.invalid_string,message:s.message}),i.dirty()):s.kind==="base64"?ll.test(e.data)||(r=this._getOrReturnCtx(e,r),ae(r,{validation:"base64",code:J.invalid_string,message:s.message}),i.dirty()):s.kind==="base64url"?ul.test(e.data)||(r=this._getOrReturnCtx(e,r),ae(r,{validation:"base64url",code:J.invalid_string,message:s.message}),i.dirty()):Ze.assertNever(s);return{status:i.value,value:e.data}}_regex(e,t,i){return this.refinement(r=>e.test(r),{validation:t,code:J.invalid_string,...pe.errToObj(i)})}_addCheck(e){return new Tn({...this._def,checks:[...this._def.checks,e]})}email(e){return this._addCheck({kind:"email",...pe.errToObj(e)})}url(e){return this._addCheck({kind:"url",...pe.errToObj(e)})}emoji(e){return this._addCheck({kind:"emoji",...pe.errToObj(e)})}uuid(e){return this._addCheck({kind:"uuid",...pe.errToObj(e)})}nanoid(e){return this._addCheck({kind:"nanoid",...pe.errToObj(e)})}cuid(e){return this._addCheck({kind:"cuid",...pe.errToObj(e)})}cuid2(e){return this._addCheck({kind:"cuid2",...pe.errToObj(e)})}ulid(e){return this._addCheck({kind:"ulid",...pe.errToObj(e)})}base64(e){return this._addCheck({kind:"base64",...pe.errToObj(e)})}base64url(e){return this._addCheck({kind:"base64url",...pe.errToObj(e)})}jwt(e){return this._addCheck({kind:"jwt",...pe.errToObj(e)})}ip(e){return this._addCheck({kind:"ip",...pe.errToObj(e)})}cidr(e){return this._addCheck({kind:"cidr",...pe.errToObj(e)})}datetime(e){return typeof e=="string"?this._addCheck({kind:"datetime",precision:null,offset:!1,local:!1,message:e}):this._addCheck({kind:"datetime",precision:typeof(e==null?void 0:e.precision)>"u"?null:e==null?void 0:e.precision,offset:(e==null?void 0:e.offset)??!1,local:(e==null?void 0:e.local)??!1,...pe.errToObj(e==null?void 0:e.message)})}date(e){return this._addCheck({kind:"date",message:e})}time(e){return typeof e=="string"?this._addCheck({kind:"time",precision:null,message:e}):this._addCheck({kind:"time",precision:typeof(e==null?void 0:e.precision)>"u"?null:e==null?void 0:e.precision,...pe.errToObj(e==null?void 0:e.message)})}duration(e){return this._addCheck({kind:"duration",...pe.errToObj(e)})}regex(e,t){return this._addCheck({kind:"regex",regex:e,...pe.errToObj(t)})}includes(e,t){return this._addCheck({kind:"includes",value:e,position:t==null?void 0:t.position,...pe.errToObj(t==null?void 0:t.message)})}startsWith(e,t){return this._addCheck({kind:"startsWith",value:e,...pe.errToObj(t)})}endsWith(e,t){return this._addCheck({kind:"endsWith",value:e,...pe.errToObj(t)})}min(e,t){return this._addCheck({kind:"min",value:e,...pe.errToObj(t)})}max(e,t){return this._addCheck({kind:"max",value:e,...pe.errToObj(t)})}length(e,t){return this._addCheck({kind:"length",value:e,...pe.errToObj(t)})}nonempty(e){return this.min(1,pe.errToObj(e))}trim(){return new Tn({...this._def,checks:[...this._def.checks,{kind:"trim"}]})}toLowerCase(){return new Tn({...this._def,checks:[...this._def.checks,{kind:"toLowerCase"}]})}toUpperCase(){return new Tn({...this._def,checks:[...this._def.checks,{kind:"toUpperCase"}]})}get isDatetime(){return!!this._def.checks.find(e=>e.kind==="datetime")}get isDate(){return!!this._def.checks.find(e=>e.kind==="date")}get isTime(){return!!this._def.checks.find(e=>e.kind==="time")}get isDuration(){return!!this._def.checks.find(e=>e.kind==="duration")}get isEmail(){return!!this._def.checks.find(e=>e.kind==="email")}get isURL(){return!!this._def.checks.find(e=>e.kind==="url")}get isEmoji(){return!!this._def.checks.find(e=>e.kind==="emoji")}get isUUID(){return!!this._def.checks.find(e=>e.kind==="uuid")}get isNANOID(){return!!this._def.checks.find(e=>e.kind==="nanoid")}get isCUID(){return!!this._def.checks.find(e=>e.kind==="cuid")}get isCUID2(){return!!this._def.checks.find(e=>e.kind==="cuid2")}get isULID(){return!!this._def.checks.find(e=>e.kind==="ulid")}get isIP(){return!!this._def.checks.find(e=>e.kind==="ip")}get isCIDR(){return!!this._def.checks.find(e=>e.kind==="cidr")}get isBase64(){return!!this._def.checks.find(e=>e.kind==="base64")}get isBase64url(){return!!this._def.checks.find(e=>e.kind==="base64url")}get minLength(){let e=null;for(const t of this._def.checks)t.kind==="min"&&(e===null||t.value>e)&&(e=t.value);return e}get maxLength(){let e=null;for(const t of this._def.checks)t.kind==="max"&&(e===null||t.value<e)&&(e=t.value);return e}}Tn.create=n=>new Tn({checks:[],typeName:Ce.ZodString,coerce:(n==null?void 0:n.coerce)??!1,...Ge(n)});function gl(n,e){const t=(n.toString().split(".")[1]||"").length,i=(e.toString().split(".")[1]||"").length,r=t>i?t:i,s=Number.parseInt(n.toFixed(r).replace(".","")),o=Number.parseInt(e.toFixed(r).replace(".",""));return s%o/10**r}class Mi extends qe{constructor(){super(...arguments),this.min=this.gte,this.max=this.lte,this.step=this.multipleOf}_parse(e){if(this._def.coerce&&(e.data=Number(e.data)),this._getType(e)!==de.number){const s=this._getOrReturnCtx(e);return ae(s,{code:J.invalid_type,expected:de.number,received:s.parsedType}),we}let i;const r=new zt;for(const s of this._def.checks)s.kind==="int"?Ze.isInteger(e.data)||(i=this._getOrReturnCtx(e,i),ae(i,{code:J.invalid_type,expected:"integer",received:"float",message:s.message}),r.dirty()):s.kind==="min"?(s.inclusive?e.data<s.value:e.data<=s.value)&&(i=this._getOrReturnCtx(e,i),ae(i,{code:J.too_small,minimum:s.value,type:"number",inclusive:s.inclusive,exact:!1,message:s.message}),r.dirty()):s.kind==="max"?(s.inclusive?e.data>s.value:e.data>=s.value)&&(i=this._getOrReturnCtx(e,i),ae(i,{code:J.too_big,maximum:s.value,type:"number",inclusive:s.inclusive,exact:!1,message:s.message}),r.dirty()):s.kind==="multipleOf"?gl(e.data,s.value)!==0&&(i=this._getOrReturnCtx(e,i),ae(i,{code:J.not_multiple_of,multipleOf:s.value,message:s.message}),r.dirty()):s.kind==="finite"?Number.isFinite(e.data)||(i=this._getOrReturnCtx(e,i),ae(i,{code:J.not_finite,message:s.message}),r.dirty()):Ze.assertNever(s);return{status:r.value,value:e.data}}gte(e,t){return this.setLimit("min",e,!0,pe.toString(t))}gt(e,t){return this.setLimit("min",e,!1,pe.toString(t))}lte(e,t){return this.setLimit("max",e,!0,pe.toString(t))}lt(e,t){return this.setLimit("max",e,!1,pe.toString(t))}setLimit(e,t,i,r){return new Mi({...this._def,checks:[...this._def.checks,{kind:e,value:t,inclusive:i,message:pe.toString(r)}]})}_addCheck(e){return new Mi({...this._def,checks:[...this._def.checks,e]})}int(e){return this._addCheck({kind:"int",message:pe.toString(e)})}positive(e){return this._addCheck({kind:"min",value:0,inclusive:!1,message:pe.toString(e)})}negative(e){return this._addCheck({kind:"max",value:0,inclusive:!1,message:pe.toString(e)})}nonpositive(e){return this._addCheck({kind:"max",value:0,inclusive:!0,message:pe.toString(e)})}nonnegative(e){return this._addCheck({kind:"min",value:0,inclusive:!0,message:pe.toString(e)})}multipleOf(e,t){return this._addCheck({kind:"multipleOf",value:e,message:pe.toString(t)})}finite(e){return this._addCheck({kind:"finite",message:pe.toString(e)})}safe(e){return this._addCheck({kind:"min",inclusive:!0,value:Number.MIN_SAFE_INTEGER,message:pe.toString(e)})._addCheck({kind:"max",inclusive:!0,value:Number.MAX_SAFE_INTEGER,message:pe.toString(e)})}get minValue(){let e=null;for(const t of this._def.checks)t.kind==="min"&&(e===null||t.value>e)&&(e=t.value);return e}get maxValue(){let e=null;for(const t of this._def.checks)t.kind==="max"&&(e===null||t.value<e)&&(e=t.value);return e}get isInt(){return!!this._def.checks.find(e=>e.kind==="int"||e.kind==="multipleOf"&&Ze.isInteger(e.value))}get isFinite(){let e=null,t=null;for(const i of this._def.checks){if(i.kind==="finite"||i.kind==="int"||i.kind==="multipleOf")return!0;i.kind==="min"?(t===null||i.value>t)&&(t=i.value):i.kind==="max"&&(e===null||i.value<e)&&(e=i.value)}return Number.isFinite(t)&&Number.isFinite(e)}}Mi.create=n=>new Mi({checks:[],typeName:Ce.ZodNumber,coerce:(n==null?void 0:n.coerce)||!1,...Ge(n)});class Bi extends qe{constructor(){super(...arguments),this.min=this.gte,this.max=this.lte}_parse(e){if(this._def.coerce)try{e.data=BigInt(e.data)}catch{return this._getInvalidInput(e)}if(this._getType(e)!==de.bigint)return this._getInvalidInput(e);let i;const r=new zt;for(const s of this._def.checks)s.kind==="min"?(s.inclusive?e.data<s.value:e.data<=s.value)&&(i=this._getOrReturnCtx(e,i),ae(i,{code:J.too_small,type:"bigint",minimum:s.value,inclusive:s.inclusive,message:s.message}),r.dirty()):s.kind==="max"?(s.inclusive?e.data>s.value:e.data>=s.value)&&(i=this._getOrReturnCtx(e,i),ae(i,{code:J.too_big,type:"bigint",maximum:s.value,inclusive:s.inclusive,message:s.message}),r.dirty()):s.kind==="multipleOf"?e.data%s.value!==BigInt(0)&&(i=this._getOrReturnCtx(e,i),ae(i,{code:J.not_multiple_of,multipleOf:s.value,message:s.message}),r.dirty()):Ze.assertNever(s);return{status:r.value,value:e.data}}_getInvalidInput(e){const t=this._getOrReturnCtx(e);return ae(t,{code:J.invalid_type,expected:de.bigint,received:t.parsedType}),we}gte(e,t){return this.setLimit("min",e,!0,pe.toString(t))}gt(e,t){return this.setLimit("min",e,!1,pe.toString(t))}lte(e,t){return this.setLimit("max",e,!0,pe.toString(t))}lt(e,t){return this.setLimit("max",e,!1,pe.toString(t))}setLimit(e,t,i,r){return new Bi({...this._def,checks:[...this._def.checks,{kind:e,value:t,inclusive:i,message:pe.toString(r)}]})}_addCheck(e){return new Bi({...this._def,checks:[...this._def.checks,e]})}positive(e){return this._addCheck({kind:"min",value:BigInt(0),inclusive:!1,message:pe.toString(e)})}negative(e){return this._addCheck({kind:"max",value:BigInt(0),inclusive:!1,message:pe.toString(e)})}nonpositive(e){return this._addCheck({kind:"max",value:BigInt(0),inclusive:!0,message:pe.toString(e)})}nonnegative(e){return this._addCheck({kind:"min",value:BigInt(0),inclusive:!0,message:pe.toString(e)})}multipleOf(e,t){return this._addCheck({kind:"multipleOf",value:e,message:pe.toString(t)})}get minValue(){let e=null;for(const t of this._def.checks)t.kind==="min"&&(e===null||t.value>e)&&(e=t.value);return e}get maxValue(){let e=null;for(const t of this._def.checks)t.kind==="max"&&(e===null||t.value<e)&&(e=t.value);return e}}Bi.create=n=>new Bi({checks:[],typeName:Ce.ZodBigInt,coerce:(n==null?void 0:n.coerce)??!1,...Ge(n)});class la extends qe{_parse(e){if(this._def.coerce&&(e.data=!!e.data),this._getType(e)!==de.boolean){const i=this._getOrReturnCtx(e);return ae(i,{code:J.invalid_type,expected:de.boolean,received:i.parsedType}),we}return Vt(e.data)}}la.create=n=>new la({typeName:Ce.ZodBoolean,coerce:(n==null?void 0:n.coerce)||!1,...Ge(n)});class xr extends qe{_parse(e){if(this._def.coerce&&(e.data=new Date(e.data)),this._getType(e)!==de.date){const s=this._getOrReturnCtx(e);return ae(s,{code:J.invalid_type,expected:de.date,received:s.parsedType}),we}if(Number.isNaN(e.data.getTime())){const s=this._getOrReturnCtx(e);return ae(s,{code:J.invalid_date}),we}const i=new zt;let r;for(const s of this._def.checks)s.kind==="min"?e.data.getTime()<s.value&&(r=this._getOrReturnCtx(e,r),ae(r,{code:J.too_small,message:s.message,inclusive:!0,exact:!1,minimum:s.value,type:"date"}),i.dirty()):s.kind==="max"?e.data.getTime()>s.value&&(r=this._getOrReturnCtx(e,r),ae(r,{code:J.too_big,message:s.message,inclusive:!0,exact:!1,maximum:s.value,type:"date"}),i.dirty()):Ze.assertNever(s);return{status:i.value,value:new Date(e.data.getTime())}}_addCheck(e){return new xr({...this._def,checks:[...this._def.checks,e]})}min(e,t){return this._addCheck({kind:"min",value:e.getTime(),message:pe.toString(t)})}max(e,t){return this._addCheck({kind:"max",value:e.getTime(),message:pe.toString(t)})}get minDate(){let e=null;for(const t of this._def.checks)t.kind==="min"&&(e===null||t.value>e)&&(e=t.value);return e!=null?new Date(e):null}get maxDate(){let e=null;for(const t of this._def.checks)t.kind==="max"&&(e===null||t.value<e)&&(e=t.value);return e!=null?new Date(e):null}}xr.create=n=>new xr({checks:[],coerce:(n==null?void 0:n.coerce)||!1,typeName:Ce.ZodDate,...Ge(n)});class ua extends qe{_parse(e){if(this._getType(e)!==de.symbol){const i=this._getOrReturnCtx(e);return ae(i,{code:J.invalid_type,expected:de.symbol,received:i.parsedType}),we}return Vt(e.data)}}ua.create=n=>new ua({typeName:Ce.ZodSymbol,...Ge(n)});class Ts extends qe{_parse(e){if(this._getType(e)!==de.undefined){const i=this._getOrReturnCtx(e);return ae(i,{code:J.invalid_type,expected:de.undefined,received:i.parsedType}),we}return Vt(e.data)}}Ts.create=n=>new Ts({typeName:Ce.ZodUndefined,...Ge(n)});class bs extends qe{_parse(e){if(this._getType(e)!==de.null){const i=this._getOrReturnCtx(e);return ae(i,{code:J.invalid_type,expected:de.null,received:i.parsedType}),we}return Vt(e.data)}}bs.create=n=>new bs({typeName:Ce.ZodNull,...Ge(n)});class da extends qe{constructor(){super(...arguments),this._any=!0}_parse(e){return Vt(e.data)}}da.create=n=>new da({typeName:Ce.ZodAny,...Ge(n)});class ha extends qe{constructor(){super(...arguments),this._unknown=!0}_parse(e){return Vt(e.data)}}ha.create=n=>new ha({typeName:Ce.ZodUnknown,...Ge(n)});class Cn extends qe{_parse(e){const t=this._getOrReturnCtx(e);return ae(t,{code:J.invalid_type,expected:de.never,received:t.parsedType}),we}}Cn.create=n=>new Cn({typeName:Ce.ZodNever,...Ge(n)});class fa extends qe{_parse(e){if(this._getType(e)!==de.undefined){const i=this._getOrReturnCtx(e);return ae(i,{code:J.invalid_type,expected:de.void,received:i.parsedType}),we}return Vt(e.data)}}fa.create=n=>new fa({typeName:Ce.ZodVoid,...Ge(n)});class Kt extends qe{_parse(e){const{ctx:t,status:i}=this._processInputParams(e),r=this._def;if(t.parsedType!==de.array)return ae(t,{code:J.invalid_type,expected:de.array,received:t.parsedType}),we;if(r.exactLength!==null){const o=t.data.length>r.exactLength.value,a=t.data.length<r.exactLength.value;(o||a)&&(ae(t,{code:o?J.too_big:J.too_small,minimum:a?r.exactLength.value:void 0,maximum:o?r.exactLength.value:void 0,type:"array",inclusive:!0,exact:!0,message:r.exactLength.message}),i.dirty())}if(r.minLength!==null&&t.data.length<r.minLength.value&&(ae(t,{code:J.too_small,minimum:r.minLength.value,type:"array",inclusive:!0,exact:!1,message:r.minLength.message}),i.dirty()),r.maxLength!==null&&t.data.length>r.maxLength.value&&(ae(t,{code:J.too_big,maximum:r.maxLength.value,type:"array",inclusive:!0,exact:!1,message:r.maxLength.message}),i.dirty()),t.common.async)return Promise.all([...t.data].map((o,a)=>r.type._parseAsync(new Rn(t,o,t.path,a)))).then(o=>zt.mergeArray(i,o));const s=[...t.data].map((o,a)=>r.type._parseSync(new Rn(t,o,t.path,a)));return zt.mergeArray(i,s)}get element(){return this._def.type}min(e,t){return new Kt({...this._def,minLength:{value:e,message:pe.toString(t)}})}max(e,t){return new Kt({...this._def,maxLength:{value:e,message:pe.toString(t)}})}length(e,t){return new Kt({...this._def,exactLength:{value:e,message:pe.toString(t)}})}nonempty(e){return this.min(1,e)}}Kt.create=(n,e)=>new Kt({type:n,minLength:null,maxLength:null,exactLength:null,typeName:Ce.ZodArray,...Ge(e)});function pi(n){if(n instanceof dt){const e={};for(const t in n.shape){const i=n.shape[t];e[t]=hn.create(pi(i))}return new dt({...n._def,shape:()=>e})}else return n instanceof Kt?new Kt({...n._def,type:pi(n.element)}):n instanceof hn?hn.create(pi(n.unwrap())):n instanceof jn?jn.create(pi(n.unwrap())):n instanceof qn?qn.create(n.items.map(e=>pi(e))):n}class dt extends qe{constructor(){super(...arguments),this._cached=null,this.nonstrict=this.passthrough,this.augment=this.extend}_getCached(){if(this._cached!==null)return this._cached;const e=this._def.shape(),t=Ze.objectKeys(e);return this._cached={shape:e,keys:t},this._cached}_parse(e){if(this._getType(e)!==de.object){const l=this._getOrReturnCtx(e);return ae(l,{code:J.invalid_type,expected:de.object,received:l.parsedType}),we}const{status:i,ctx:r}=this._processInputParams(e),{shape:s,keys:o}=this._getCached(),a=[];if(!(this._def.catchall instanceof Cn&&this._def.unknownKeys==="strip"))for(const l in r.data)o.includes(l)||a.push(l);const c=[];for(const l of o){const u=s[l],h=r.data[l];c.push({key:{status:"valid",value:l},value:u._parse(new Rn(r,h,r.path,l)),alwaysSet:l in r.data})}if(this._def.catchall instanceof Cn){const l=this._def.unknownKeys;if(l==="passthrough")for(const u of a)c.push({key:{status:"valid",value:u},value:{status:"valid",value:r.data[u]}});else if(l==="strict")a.length>0&&(ae(r,{code:J.unrecognized_keys,keys:a}),i.dirty());else if(l!=="strip")throw new Error("Internal ZodObject error: invalid unknownKeys value.")}else{const l=this._def.catchall;for(const u of a){const h=r.data[u];c.push({key:{status:"valid",value:u},value:l._parse(new Rn(r,h,r.path,u)),alwaysSet:u in r.data})}}return r.common.async?Promise.resolve().then(async()=>{const l=[];for(const u of c){const h=await u.key,f=await u.value;l.push({key:h,value:f,alwaysSet:u.alwaysSet})}return l}).then(l=>zt.mergeObjectSync(i,l)):zt.mergeObjectSync(i,c)}get shape(){return this._def.shape()}strict(e){return pe.errToObj,new dt({...this._def,unknownKeys:"strict",...e!==void 0?{errorMap:(t,i)=>{var s,o;const r=((o=(s=this._def).errorMap)==null?void 0:o.call(s,t,i).message)??i.defaultError;return t.code==="unrecognized_keys"?{message:pe.errToObj(e).message??r}:{message:r}}}:{}})}strip(){return new dt({...this._def,unknownKeys:"strip"})}passthrough(){return new dt({...this._def,unknownKeys:"passthrough"})}extend(e){return new dt({...this._def,shape:()=>({...this._def.shape(),...e})})}merge(e){return new dt({unknownKeys:e._def.unknownKeys,catchall:e._def.catchall,shape:()=>({...this._def.shape(),...e._def.shape()}),typeName:Ce.ZodObject})}setKey(e,t){return this.augment({[e]:t})}catchall(e){return new dt({...this._def,catchall:e})}pick(e){const t={};for(const i of Ze.objectKeys(e))e[i]&&this.shape[i]&&(t[i]=this.shape[i]);return new dt({...this._def,shape:()=>t})}omit(e){const t={};for(const i of Ze.objectKeys(this.shape))e[i]||(t[i]=this.shape[i]);return new dt({...this._def,shape:()=>t})}deepPartial(){return pi(this)}partial(e){const t={};for(const i of Ze.objectKeys(this.shape)){const r=this.shape[i];e&&!e[i]?t[i]=r:t[i]=r.optional()}return new dt({...this._def,shape:()=>t})}required(e){const t={};for(const i of Ze.objectKeys(this.shape))if(e&&!e[i])t[i]=this.shape[i];else{let s=this.shape[i];for(;s instanceof hn;)s=s._def.innerType;t[i]=s}return new dt({...this._def,shape:()=>t})}keyof(){return Ho(Ze.objectKeys(this.shape))}}dt.create=(n,e)=>new dt({shape:()=>n,unknownKeys:"strip",catchall:Cn.create(),typeName:Ce.ZodObject,...Ge(e)});dt.strictCreate=(n,e)=>new dt({shape:()=>n,unknownKeys:"strict",catchall:Cn.create(),typeName:Ce.ZodObject,...Ge(e)});dt.lazycreate=(n,e)=>new dt({shape:n,unknownKeys:"strip",catchall:Cn.create(),typeName:Ce.ZodObject,...Ge(e)});class Mr extends qe{_parse(e){const{ctx:t}=this._processInputParams(e),i=this._def.options;function r(s){for(const a of s)if(a.result.status==="valid")return a.result;for(const a of s)if(a.result.status==="dirty")return t.common.issues.push(...a.ctx.common.issues),a.result;const o=s.map(a=>new pn(a.ctx.common.issues));return ae(t,{code:J.invalid_union,unionErrors:o}),we}if(t.common.async)return Promise.all(i.map(async s=>{const o={...t,common:{...t.common,issues:[]},parent:null};return{result:await s._parseAsync({data:t.data,path:t.path,parent:o}),ctx:o}})).then(r);{let s;const o=[];for(const c of i){const l={...t,common:{...t.common,issues:[]},parent:null},u=c._parseSync({data:t.data,path:t.path,parent:l});if(u.status==="valid")return u;u.status==="dirty"&&!s&&(s={result:u,ctx:l}),l.common.issues.length&&o.push(l.common.issues)}if(s)return t.common.issues.push(...s.ctx.common.issues),s.result;const a=o.map(c=>new pn(c));return ae(t,{code:J.invalid_union,unionErrors:a}),we}}get options(){return this._def.options}}Mr.create=(n,e)=>new Mr({options:n,typeName:Ce.ZodUnion,...Ge(e)});const on=n=>n instanceof ws?on(n.schema):n instanceof Zn?on(n.innerType()):n instanceof yr?[n.value]:n instanceof Yn?n.options:n instanceof Rs?Ze.objectValues(n.enum):n instanceof Tr?on(n._def.innerType):n instanceof Ts?[void 0]:n instanceof bs?[null]:n instanceof hn?[void 0,...on(n.unwrap())]:n instanceof jn?[null,...on(n.unwrap())]:n instanceof Vo||n instanceof Ar?on(n.unwrap()):n instanceof br?on(n._def.innerType):[];class ks extends qe{_parse(e){const{ctx:t}=this._processInputParams(e);if(t.parsedType!==de.object)return ae(t,{code:J.invalid_type,expected:de.object,received:t.parsedType}),we;const i=this.discriminator,r=t.data[i],s=this.optionsMap.get(r);return s?t.common.async?s._parseAsync({data:t.data,path:t.path,parent:t}):s._parseSync({data:t.data,path:t.path,parent:t}):(ae(t,{code:J.invalid_union_discriminator,options:Array.from(this.optionsMap.keys()),path:[i]}),we)}get discriminator(){return this._def.discriminator}get options(){return this._def.options}get optionsMap(){return this._def.optionsMap}static create(e,t,i){const r=new Map;for(const s of t){const o=on(s.shape[e]);if(!o.length)throw new Error(`A discriminator value for key \`${e}\` could not be extracted from all schema options`);for(const a of o){if(r.has(a))throw new Error(`Discriminator property ${String(e)} has duplicate value ${String(a)}`);r.set(a,s)}}return new ks({typeName:Ce.ZodDiscriminatedUnion,discriminator:e,options:t,optionsMap:r,...Ge(i)})}}function As(n,e){const t=En(n),i=En(e);if(n===e)return{valid:!0,data:n};if(t===de.object&&i===de.object){const r=Ze.objectKeys(e),s=Ze.objectKeys(n).filter(a=>r.indexOf(a)!==-1),o={...n,...e};for(const a of s){const c=As(n[a],e[a]);if(!c.valid)return{valid:!1};o[a]=c.data}return{valid:!0,data:o}}else if(t===de.array&&i===de.array){if(n.length!==e.length)return{valid:!1};const r=[];for(let s=0;s<n.length;s++){const o=n[s],a=e[s],c=As(o,a);if(!c.valid)return{valid:!1};r.push(c.data)}return{valid:!0,data:r}}else return t===de.date&&i===de.date&&+n==+e?{valid:!0,data:n}:{valid:!1}}class Sr extends qe{_parse(e){const{status:t,ctx:i}=this._processInputParams(e),r=(s,o)=>{if(aa(s)||aa(o))return we;const a=As(s.value,o.value);return a.valid?((oa(s)||oa(o))&&t.dirty(),{status:t.value,value:a.data}):(ae(i,{code:J.invalid_intersection_types}),we)};return i.common.async?Promise.all([this._def.left._parseAsync({data:i.data,path:i.path,parent:i}),this._def.right._parseAsync({data:i.data,path:i.path,parent:i})]).then(([s,o])=>r(s,o)):r(this._def.left._parseSync({data:i.data,path:i.path,parent:i}),this._def.right._parseSync({data:i.data,path:i.path,parent:i}))}}Sr.create=(n,e,t)=>new Sr({left:n,right:e,typeName:Ce.ZodIntersection,...Ge(t)});class qn extends qe{_parse(e){const{status:t,ctx:i}=this._processInputParams(e);if(i.parsedType!==de.array)return ae(i,{code:J.invalid_type,expected:de.array,received:i.parsedType}),we;if(i.data.length<this._def.items.length)return ae(i,{code:J.too_small,minimum:this._def.items.length,inclusive:!0,exact:!1,type:"array"}),we;!this._def.rest&&i.data.length>this._def.items.length&&(ae(i,{code:J.too_big,maximum:this._def.items.length,inclusive:!0,exact:!1,type:"array"}),t.dirty());const s=[...i.data].map((o,a)=>{const c=this._def.items[a]||this._def.rest;return c?c._parse(new Rn(i,o,i.path,a)):null}).filter(o=>!!o);return i.common.async?Promise.all(s).then(o=>zt.mergeArray(t,o)):zt.mergeArray(t,s)}get items(){return this._def.items}rest(e){return new qn({...this._def,rest:e})}}qn.create=(n,e)=>{if(!Array.isArray(n))throw new Error("You must pass an array of schemas to z.tuple([ ... ])");return new qn({items:n,typeName:Ce.ZodTuple,rest:null,...Ge(e)})};class pa extends qe{get keySchema(){return this._def.keyType}get valueSchema(){return this._def.valueType}_parse(e){const{status:t,ctx:i}=this._processInputParams(e);if(i.parsedType!==de.map)return ae(i,{code:J.invalid_type,expected:de.map,received:i.parsedType}),we;const r=this._def.keyType,s=this._def.valueType,o=[...i.data.entries()].map(([a,c],l)=>({key:r._parse(new Rn(i,a,i.path,[l,"key"])),value:s._parse(new Rn(i,c,i.path,[l,"value"]))}));if(i.common.async){const a=new Map;return Promise.resolve().then(async()=>{for(const c of o){const l=await c.key,u=await c.value;if(l.status==="aborted"||u.status==="aborted")return we;(l.status==="dirty"||u.status==="dirty")&&t.dirty(),a.set(l.value,u.value)}return{status:t.value,value:a}})}else{const a=new Map;for(const c of o){const l=c.key,u=c.value;if(l.status==="aborted"||u.status==="aborted")return we;(l.status==="dirty"||u.status==="dirty")&&t.dirty(),a.set(l.value,u.value)}return{status:t.value,value:a}}}}pa.create=(n,e,t)=>new pa({valueType:e,keyType:n,typeName:Ce.ZodMap,...Ge(t)});class zi extends qe{_parse(e){const{status:t,ctx:i}=this._processInputParams(e);if(i.parsedType!==de.set)return ae(i,{code:J.invalid_type,expected:de.set,received:i.parsedType}),we;const r=this._def;r.minSize!==null&&i.data.size<r.minSize.value&&(ae(i,{code:J.too_small,minimum:r.minSize.value,type:"set",inclusive:!0,exact:!1,message:r.minSize.message}),t.dirty()),r.maxSize!==null&&i.data.size>r.maxSize.value&&(ae(i,{code:J.too_big,maximum:r.maxSize.value,type:"set",inclusive:!0,exact:!1,message:r.maxSize.message}),t.dirty());const s=this._def.valueType;function o(c){const l=new Set;for(const u of c){if(u.status==="aborted")return we;u.status==="dirty"&&t.dirty(),l.add(u.value)}return{status:t.value,value:l}}const a=[...i.data.values()].map((c,l)=>s._parse(new Rn(i,c,i.path,l)));return i.common.async?Promise.all(a).then(c=>o(c)):o(a)}min(e,t){return new zi({...this._def,minSize:{value:e,message:pe.toString(t)}})}max(e,t){return new zi({...this._def,maxSize:{value:e,message:pe.toString(t)}})}size(e,t){return this.min(e,t).max(e,t)}nonempty(e){return this.min(1,e)}}zi.create=(n,e)=>new zi({valueType:n,minSize:null,maxSize:null,typeName:Ce.ZodSet,...Ge(e)});class ws extends qe{get schema(){return this._def.getter()}_parse(e){const{ctx:t}=this._processInputParams(e);return this._def.getter()._parse({data:t.data,path:t.path,parent:t})}}ws.create=(n,e)=>new ws({getter:n,typeName:Ce.ZodLazy,...Ge(e)});class yr extends qe{_parse(e){if(e.data!==this._def.value){const t=this._getOrReturnCtx(e);return ae(t,{received:t.data,code:J.invalid_literal,expected:this._def.value}),we}return{status:"valid",value:e.data}}get value(){return this._def.value}}yr.create=(n,e)=>new yr({value:n,typeName:Ce.ZodLiteral,...Ge(e)});function Ho(n,e){return new Yn({values:n,typeName:Ce.ZodEnum,...Ge(e)})}class Yn extends qe{_parse(e){if(typeof e.data!="string"){const t=this._getOrReturnCtx(e),i=this._def.values;return ae(t,{expected:Ze.joinValues(i),received:t.parsedType,code:J.invalid_type}),we}if(this._cache||(this._cache=new Set(this._def.values)),!this._cache.has(e.data)){const t=this._getOrReturnCtx(e),i=this._def.values;return ae(t,{received:t.data,code:J.invalid_enum_value,options:i}),we}return Vt(e.data)}get options(){return this._def.values}get enum(){const e={};for(const t of this._def.values)e[t]=t;return e}get Values(){const e={};for(const t of this._def.values)e[t]=t;return e}get Enum(){const e={};for(const t of this._def.values)e[t]=t;return e}extract(e,t=this._def){return Yn.create(e,{...this._def,...t})}exclude(e,t=this._def){return Yn.create(this.options.filter(i=>!e.includes(i)),{...this._def,...t})}}Yn.create=Ho;class Rs extends qe{_parse(e){const t=Ze.getValidEnumValues(this._def.values),i=this._getOrReturnCtx(e);if(i.parsedType!==de.string&&i.parsedType!==de.number){const r=Ze.objectValues(t);return ae(i,{expected:Ze.joinValues(r),received:i.parsedType,code:J.invalid_type}),we}if(this._cache||(this._cache=new Set(Ze.getValidEnumValues(this._def.values))),!this._cache.has(e.data)){const r=Ze.objectValues(t);return ae(i,{received:i.data,code:J.invalid_enum_value,options:r}),we}return Vt(e.data)}get enum(){return this._def.values}}Rs.create=(n,e)=>new Rs({values:n,typeName:Ce.ZodNativeEnum,...Ge(e)});class Er extends qe{unwrap(){return this._def.type}_parse(e){const{ctx:t}=this._processInputParams(e);if(t.parsedType!==de.promise&&t.common.async===!1)return ae(t,{code:J.invalid_type,expected:de.promise,received:t.parsedType}),we;const i=t.parsedType===de.promise?t.data:Promise.resolve(t.data);return Vt(i.then(r=>this._def.type.parseAsync(r,{path:t.path,errorMap:t.common.contextualErrorMap})))}}Er.create=(n,e)=>new Er({type:n,typeName:Ce.ZodPromise,...Ge(e)});class Zn extends qe{innerType(){return this._def.schema}sourceType(){return this._def.schema._def.typeName===Ce.ZodEffects?this._def.schema.sourceType():this._def.schema}_parse(e){const{status:t,ctx:i}=this._processInputParams(e),r=this._def.effect||null,s={addIssue:o=>{ae(i,o),o.fatal?t.abort():t.dirty()},get path(){return i.path}};if(s.addIssue=s.addIssue.bind(s),r.type==="preprocess"){const o=r.transform(i.data,s);if(i.common.async)return Promise.resolve(o).then(async a=>{if(t.value==="aborted")return we;const c=await this._def.schema._parseAsync({data:a,path:i.path,parent:i});return c.status==="aborted"?we:c.status==="dirty"||t.value==="dirty"?Ni(c.value):c});{if(t.value==="aborted")return we;const a=this._def.schema._parseSync({data:o,path:i.path,parent:i});return a.status==="aborted"?we:a.status==="dirty"||t.value==="dirty"?Ni(a.value):a}}if(r.type==="refinement"){const o=a=>{const c=r.refinement(a,s);if(i.common.async)return Promise.resolve(c);if(c instanceof Promise)throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");return a};if(i.common.async===!1){const a=this._def.schema._parseSync({data:i.data,path:i.path,parent:i});return a.status==="aborted"?we:(a.status==="dirty"&&t.dirty(),o(a.value),{status:t.value,value:a.value})}else return this._def.schema._parseAsync({data:i.data,path:i.path,parent:i}).then(a=>a.status==="aborted"?we:(a.status==="dirty"&&t.dirty(),o(a.value).then(()=>({status:t.value,value:a.value}))))}if(r.type==="transform")if(i.common.async===!1){const o=this._def.schema._parseSync({data:i.data,path:i.path,parent:i});if(!xi(o))return we;const a=r.transform(o.value,s);if(a instanceof Promise)throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");return{status:t.value,value:a}}else return this._def.schema._parseAsync({data:i.data,path:i.path,parent:i}).then(o=>xi(o)?Promise.resolve(r.transform(o.value,s)).then(a=>({status:t.value,value:a})):we);Ze.assertNever(r)}}Zn.create=(n,e,t)=>new Zn({schema:n,typeName:Ce.ZodEffects,effect:e,...Ge(t)});Zn.createWithPreprocess=(n,e,t)=>new Zn({schema:e,effect:{type:"preprocess",transform:n},typeName:Ce.ZodEffects,...Ge(t)});class hn extends qe{_parse(e){return this._getType(e)===de.undefined?Vt(void 0):this._def.innerType._parse(e)}unwrap(){return this._def.innerType}}hn.create=(n,e)=>new hn({innerType:n,typeName:Ce.ZodOptional,...Ge(e)});class jn extends qe{_parse(e){return this._getType(e)===de.null?Vt(null):this._def.innerType._parse(e)}unwrap(){return this._def.innerType}}jn.create=(n,e)=>new jn({innerType:n,typeName:Ce.ZodNullable,...Ge(e)});class Tr extends qe{_parse(e){const{ctx:t}=this._processInputParams(e);let i=t.data;return t.parsedType===de.undefined&&(i=this._def.defaultValue()),this._def.innerType._parse({data:i,path:t.path,parent:t})}removeDefault(){return this._def.innerType}}Tr.create=(n,e)=>new Tr({innerType:n,typeName:Ce.ZodDefault,defaultValue:typeof e.default=="function"?e.default:()=>e.default,...Ge(e)});class br extends qe{_parse(e){const{ctx:t}=this._processInputParams(e),i={...t,common:{...t.common,issues:[]}},r=this._def.innerType._parse({data:i.data,path:i.path,parent:{...i}});return vr(r)?r.then(s=>({status:"valid",value:s.status==="valid"?s.value:this._def.catchValue({get error(){return new pn(i.common.issues)},input:i.data})})):{status:"valid",value:r.status==="valid"?r.value:this._def.catchValue({get error(){return new pn(i.common.issues)},input:i.data})}}removeCatch(){return this._def.innerType}}br.create=(n,e)=>new br({innerType:n,typeName:Ce.ZodCatch,catchValue:typeof e.catch=="function"?e.catch:()=>e.catch,...Ge(e)});class ma extends qe{_parse(e){if(this._getType(e)!==de.nan){const i=this._getOrReturnCtx(e);return ae(i,{code:J.invalid_type,expected:de.nan,received:i.parsedType}),we}return{status:"valid",value:e.data}}}ma.create=n=>new ma({typeName:Ce.ZodNaN,...Ge(n)});class Vo extends qe{_parse(e){const{ctx:t}=this._processInputParams(e),i=t.data;return this._def.type._parse({data:i,path:t.path,parent:t})}unwrap(){return this._def.type}}class Gs extends qe{_parse(e){const{status:t,ctx:i}=this._processInputParams(e);if(i.common.async)return(async()=>{const s=await this._def.in._parseAsync({data:i.data,path:i.path,parent:i});return s.status==="aborted"?we:s.status==="dirty"?(t.dirty(),Ni(s.value)):this._def.out._parseAsync({data:s.value,path:i.path,parent:i})})();{const r=this._def.in._parseSync({data:i.data,path:i.path,parent:i});return r.status==="aborted"?we:r.status==="dirty"?(t.dirty(),{status:"dirty",value:r.value}):this._def.out._parseSync({data:r.value,path:i.path,parent:i})}}static create(e,t){return new Gs({in:e,out:t,typeName:Ce.ZodPipeline})}}class Ar extends qe{_parse(e){const t=this._def.innerType._parse(e),i=r=>(xi(r)&&(r.value=Object.freeze(r.value)),r);return vr(t)?t.then(r=>i(r)):i(t)}unwrap(){return this._def.innerType}}Ar.create=(n,e)=>new Ar({innerType:n,typeName:Ce.ZodReadonly,...Ge(e)});var Ce;(function(n){n.ZodString="ZodString",n.ZodNumber="ZodNumber",n.ZodNaN="ZodNaN",n.ZodBigInt="ZodBigInt",n.ZodBoolean="ZodBoolean",n.ZodDate="ZodDate",n.ZodSymbol="ZodSymbol",n.ZodUndefined="ZodUndefined",n.ZodNull="ZodNull",n.ZodAny="ZodAny",n.ZodUnknown="ZodUnknown",n.ZodNever="ZodNever",n.ZodVoid="ZodVoid",n.ZodArray="ZodArray",n.ZodObject="ZodObject",n.ZodUnion="ZodUnion",n.ZodDiscriminatedUnion="ZodDiscriminatedUnion",n.ZodIntersection="ZodIntersection",n.ZodTuple="ZodTuple",n.ZodRecord="ZodRecord",n.ZodMap="ZodMap",n.ZodSet="ZodSet",n.ZodFunction="ZodFunction",n.ZodLazy="ZodLazy",n.ZodLiteral="ZodLiteral",n.ZodEnum="ZodEnum",n.ZodEffects="ZodEffects",n.ZodNativeEnum="ZodNativeEnum",n.ZodOptional="ZodOptional",n.ZodNullable="ZodNullable",n.ZodDefault="ZodDefault",n.ZodCatch="ZodCatch",n.ZodPromise="ZodPromise",n.ZodBranded="ZodBranded",n.ZodPipeline="ZodPipeline",n.ZodReadonly="ZodReadonly"})(Ce||(Ce={}));const Si=Tn.create,rt=Mi.create;Cn.create;const Wo=Kt.create,gn=dt.create;Mr.create;const Xo=ks.create;Sr.create;const Cs=qn.create,Hs=yr.create,Wr=Yn.create;Er.create;hn.create;jn.create;const vl=gn({lat:rt().min(-90).max(90),lon:rt().min(-180).max(180),height:rt()}),qo=gn({x:rt(),y:rt(),z:rt(),yaw_deg:rt().optional(),pitch_deg:rt().optional(),roll_deg:rt().optional()}),xl=gn({type:Hs("zenoh"),topic:Si().min(1)}),Ml=Xo("type",[xl]),Sl=gn({id:Si().min(1),type:Hs("camera"),mount:qo,fov_deg:rt().positive().max(180),resolution:Cs([rt().int().positive(),rt().int().positive()]),rate_hz:rt().positive()}),yl=gn({id:Si().min(1),type:Hs("lidar"),mount:qo,channels:rt().int().positive(),range_m:rt().positive(),rate_hz:rt().positive()}),El=Xo("type",[Sl,yl]),Tl=gn({id:Si().min(1),model:Si().min(1),pose_source:Ml,sensors:Wo(El).default([])}),bl=gn({rendering:Wr(["replace","inject","inject_all"]),clock:Wr(["external_fmi","wall","stepped"]),determinism:Wr(["strict","relaxed"])}),Al=gn({name:Si().min(1),anchor:vl,vessels:Wo(Tl).min(1),modes:bl});function wl(n){const e=Al.parse(n);return{name:e.name,anchor:e.anchor,vessels:e.vessels,modes:e.modes}}/**
 * @license
 * Copyright 2010-2023 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Vs="160",Rl=0,_a=1,Cl=2,Yo=1,Ll=2,cn=3,Ln=0,Ut=1,ln=2,fn=0,gi=1,ga=2,va=3,xa=4,Pl=5,kn=100,Dl=101,Ul=102,Ma=103,Sa=104,Il=200,Nl=201,Ol=202,Fl=203,Ls=204,Ps=205,Bl=206,zl=207,kl=208,Gl=209,Hl=210,Vl=211,Wl=212,Xl=213,ql=214,Yl=0,Zl=1,jl=2,wr=3,$l=4,Kl=5,Jl=6,Ql=7,Zo=0,eu=1,tu=2,wn=0,nu=1,iu=2,ru=3,su=4,au=5,ou=6,jo=300,yi=301,Ei=302,Ds=303,Us=304,Ur=306,Is=1e3,Zt=1001,Ns=1002,xt=1003,ya=1004,Xr=1005,Lt=1006,cu=1007,ki=1008,Jt=1009,lu=1010,uu=1011,Ws=1012,$o=1013,bn=1014,An=1015,Gi=1016,Ko=1017,Jo=1018,Hn=1020,du=1021,Ft=1023,hu=1024,fu=1025,Vn=1026,Ti=1027,pu=1028,Qo=1029,mu=1030,ec=1031,tc=1033,qr=33776,Yr=33777,Zr=33778,jr=33779,Ea=35840,Ta=35841,ba=35842,Aa=35843,nc=36196,wa=37492,Ra=37496,Ca=37808,La=37809,Pa=37810,Da=37811,Ua=37812,Ia=37813,Na=37814,Oa=37815,Fa=37816,Ba=37817,za=37818,ka=37819,Ga=37820,Ha=37821,$r=36492,Va=36494,Wa=36495,_u=36283,Xa=36284,qa=36285,Ya=36286,ic=3e3,Wn=3001,gu=3200,rc=3201,sc=0,vu=1,Ht="",Mt="srgb",mn="srgb-linear",Xs="display-p3",Ir="display-p3-linear",Rr="linear",it="srgb",Cr="rec709",Lr="p3",Jn=7680,Za=519,xu=512,Mu=513,Su=514,ac=515,yu=516,Eu=517,Tu=518,bu=519,ja=35044,$a="300 es",Os=1035,un=2e3,Pr=2001;class Ai{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;const i=this._listeners;return i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;const r=this._listeners[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){if(this._listeners===void 0)return;const i=this._listeners[e.type];if(i!==void 0){e.target=this;const r=i.slice(0);for(let s=0,o=r.length;s<o;s++)r[s].call(this,e);e.target=null}}}const Et=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Kr=Math.PI/180,Fs=180/Math.PI;function Hi(){const n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Et[n&255]+Et[n>>8&255]+Et[n>>16&255]+Et[n>>24&255]+"-"+Et[e&255]+Et[e>>8&255]+"-"+Et[e>>16&15|64]+Et[e>>24&255]+"-"+Et[t&63|128]+Et[t>>8&255]+"-"+Et[t>>16&255]+Et[t>>24&255]+Et[i&255]+Et[i>>8&255]+Et[i>>16&255]+Et[i>>24&255]).toLowerCase()}function Pt(n,e,t){return Math.max(e,Math.min(t,n))}function Au(n,e){return(n%e+e)%e}function Jr(n,e,t){return(1-t)*n+t*e}function Ka(n){return(n&n-1)===0&&n!==0}function Bs(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function Li(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function Ct(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}class $e{constructor(e=0,t=0){$e.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6],this.y=r[1]*t+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Pt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),r=Math.sin(t),s=this.x-e.x,o=this.y-e.y;return this.x=s*i-o*r+e.x,this.y=s*r+o*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class We{constructor(e,t,i,r,s,o,a,c,l){We.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,o,a,c,l)}set(e,t,i,r,s,o,a,c,l){const u=this.elements;return u[0]=e,u[1]=r,u[2]=a,u[3]=t,u[4]=s,u[5]=c,u[6]=i,u[7]=o,u[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,o=i[0],a=i[3],c=i[6],l=i[1],u=i[4],h=i[7],f=i[2],m=i[5],g=i[8],v=r[0],p=r[3],d=r[6],T=r[1],x=r[4],w=r[7],P=r[2],R=r[5],A=r[8];return s[0]=o*v+a*T+c*P,s[3]=o*p+a*x+c*R,s[6]=o*d+a*w+c*A,s[1]=l*v+u*T+h*P,s[4]=l*p+u*x+h*R,s[7]=l*d+u*w+h*A,s[2]=f*v+m*T+g*P,s[5]=f*p+m*x+g*R,s[8]=f*d+m*w+g*A,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],c=e[6],l=e[7],u=e[8];return t*o*u-t*a*l-i*s*u+i*a*c+r*s*l-r*o*c}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],c=e[6],l=e[7],u=e[8],h=u*o-a*l,f=a*c-u*s,m=l*s-o*c,g=t*h+i*f+r*m;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const v=1/g;return e[0]=h*v,e[1]=(r*l-u*i)*v,e[2]=(a*i-r*o)*v,e[3]=f*v,e[4]=(u*t-r*c)*v,e[5]=(r*s-a*t)*v,e[6]=m*v,e[7]=(i*c-l*t)*v,e[8]=(o*t-i*s)*v,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,r,s,o,a){const c=Math.cos(s),l=Math.sin(s);return this.set(i*c,i*l,-i*(c*o+l*a)+o+e,-r*l,r*c,-r*(-l*o+c*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(Qr.makeScale(e,t)),this}rotate(e){return this.premultiply(Qr.makeRotation(-e)),this}translate(e,t){return this.premultiply(Qr.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<9;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Qr=new We;function oc(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function Dr(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function wu(){const n=Dr("canvas");return n.style.display="block",n}const Ja={};function Fi(n){n in Ja||(Ja[n]=!0,console.warn(n))}const Qa=new We().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),eo=new We().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),ji={[mn]:{transfer:Rr,primaries:Cr,toReference:n=>n,fromReference:n=>n},[Mt]:{transfer:it,primaries:Cr,toReference:n=>n.convertSRGBToLinear(),fromReference:n=>n.convertLinearToSRGB()},[Ir]:{transfer:Rr,primaries:Lr,toReference:n=>n.applyMatrix3(eo),fromReference:n=>n.applyMatrix3(Qa)},[Xs]:{transfer:it,primaries:Lr,toReference:n=>n.convertSRGBToLinear().applyMatrix3(eo),fromReference:n=>n.applyMatrix3(Qa).convertLinearToSRGB()}},Ru=new Set([mn,Ir]),Qe={enabled:!0,_workingColorSpace:mn,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(n){if(!Ru.has(n))throw new Error(`Unsupported working color space, "${n}".`);this._workingColorSpace=n},convert:function(n,e,t){if(this.enabled===!1||e===t||!e||!t)return n;const i=ji[e].toReference,r=ji[t].fromReference;return r(i(n))},fromWorkingColorSpace:function(n,e){return this.convert(n,this._workingColorSpace,e)},toWorkingColorSpace:function(n,e){return this.convert(n,e,this._workingColorSpace)},getPrimaries:function(n){return ji[n].primaries},getTransfer:function(n){return n===Ht?Rr:ji[n].transfer}};function vi(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function es(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let Qn;class cc{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{Qn===void 0&&(Qn=Dr("canvas")),Qn.width=e.width,Qn.height=e.height;const i=Qn.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),t=Qn}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Dr("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const r=i.getImageData(0,0,e.width,e.height),s=r.data;for(let o=0;o<s.length;o++)s[o]=vi(s[o]/255)*255;return i.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(vi(t[i]/255)*255):t[i]=vi(t[i]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Cu=0;class lc{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Cu++}),this.uuid=Hi(),this.data=e,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let o=0,a=r.length;o<a;o++)r[o].isDataTexture?s.push(ts(r[o].image)):s.push(ts(r[o]))}else s=ts(r);i.url=s}return t||(e.images[this.uuid]=i),i}}function ts(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?cc.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Lu=0;class Bt extends Ai{constructor(e=Bt.DEFAULT_IMAGE,t=Bt.DEFAULT_MAPPING,i=Zt,r=Zt,s=Lt,o=ki,a=Ft,c=Jt,l=Bt.DEFAULT_ANISOTROPY,u=Ht){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Lu++}),this.uuid=Hi(),this.name="",this.source=new lc(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new $e(0,0),this.repeat=new $e(1,1),this.center=new $e(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new We,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,typeof u=="string"?this.colorSpace=u:(Fi("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=u===Wn?Mt:Ht),this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.needsPMREMUpdate=!1}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==jo)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Is:e.x=e.x-Math.floor(e.x);break;case Zt:e.x=e.x<0?0:1;break;case Ns:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Is:e.y=e.y-Math.floor(e.y);break;case Zt:e.y=e.y<0?0:1;break;case Ns:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}get encoding(){return Fi("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace===Mt?Wn:ic}set encoding(e){Fi("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=e===Wn?Mt:Ht}}Bt.DEFAULT_IMAGE=null;Bt.DEFAULT_MAPPING=jo;Bt.DEFAULT_ANISOTROPY=1;class vt{constructor(e=0,t=0,i=0,r=1){vt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,r){return this.x=e,this.y=t,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=this.w,o=e.elements;return this.x=o[0]*t+o[4]*i+o[8]*r+o[12]*s,this.y=o[1]*t+o[5]*i+o[9]*r+o[13]*s,this.z=o[2]*t+o[6]*i+o[10]*r+o[14]*s,this.w=o[3]*t+o[7]*i+o[11]*r+o[15]*s,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,r,s;const c=e.elements,l=c[0],u=c[4],h=c[8],f=c[1],m=c[5],g=c[9],v=c[2],p=c[6],d=c[10];if(Math.abs(u-f)<.01&&Math.abs(h-v)<.01&&Math.abs(g-p)<.01){if(Math.abs(u+f)<.1&&Math.abs(h+v)<.1&&Math.abs(g+p)<.1&&Math.abs(l+m+d-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const x=(l+1)/2,w=(m+1)/2,P=(d+1)/2,R=(u+f)/4,A=(h+v)/4,q=(g+p)/4;return x>w&&x>P?x<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(x),r=R/i,s=A/i):w>P?w<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(w),i=R/r,s=q/r):P<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(P),i=A/s,r=q/s),this.set(i,r,s,t),this}let T=Math.sqrt((p-g)*(p-g)+(h-v)*(h-v)+(f-u)*(f-u));return Math.abs(T)<.001&&(T=1),this.x=(p-g)/T,this.y=(h-v)/T,this.z=(f-u)/T,this.w=Math.acos((l+m+d-1)/2),this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Pu extends Ai{constructor(e=1,t=1,i={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new vt(0,0,e,t),this.scissorTest=!1,this.viewport=new vt(0,0,e,t);const r={width:e,height:t,depth:1};i.encoding!==void 0&&(Fi("THREE.WebGLRenderTarget: option.encoding has been replaced by option.colorSpace."),i.colorSpace=i.encoding===Wn?Mt:Ht),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Lt,depthBuffer:!0,stencilBuffer:!1,depthTexture:null,samples:0},i),this.texture=new Bt(r,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.flipY=!1,this.texture.generateMipmaps=i.generateMipmaps,this.texture.internalFormat=i.internalFormat,this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.depthTexture=i.depthTexture,this.samples=i.samples}setSize(e,t,i=1){(this.width!==e||this.height!==t||this.depth!==i)&&(this.width=e,this.height=t,this.depth=i,this.texture.image.width=e,this.texture.image.height=t,this.texture.image.depth=i,this.dispose()),this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.texture=e.texture.clone(),this.texture.isRenderTargetTexture=!0;const t=Object.assign({},e.texture.image);return this.texture.source=new lc(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class _n extends Pu{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class uc extends Bt{constructor(e=null,t=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=xt,this.minFilter=xt,this.wrapR=Zt,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Du extends Bt{constructor(e=null,t=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=xt,this.minFilter=xt,this.wrapR=Zt,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Vi{constructor(e=0,t=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=r}static slerpFlat(e,t,i,r,s,o,a){let c=i[r+0],l=i[r+1],u=i[r+2],h=i[r+3];const f=s[o+0],m=s[o+1],g=s[o+2],v=s[o+3];if(a===0){e[t+0]=c,e[t+1]=l,e[t+2]=u,e[t+3]=h;return}if(a===1){e[t+0]=f,e[t+1]=m,e[t+2]=g,e[t+3]=v;return}if(h!==v||c!==f||l!==m||u!==g){let p=1-a;const d=c*f+l*m+u*g+h*v,T=d>=0?1:-1,x=1-d*d;if(x>Number.EPSILON){const P=Math.sqrt(x),R=Math.atan2(P,d*T);p=Math.sin(p*R)/P,a=Math.sin(a*R)/P}const w=a*T;if(c=c*p+f*w,l=l*p+m*w,u=u*p+g*w,h=h*p+v*w,p===1-a){const P=1/Math.sqrt(c*c+l*l+u*u+h*h);c*=P,l*=P,u*=P,h*=P}}e[t]=c,e[t+1]=l,e[t+2]=u,e[t+3]=h}static multiplyQuaternionsFlat(e,t,i,r,s,o){const a=i[r],c=i[r+1],l=i[r+2],u=i[r+3],h=s[o],f=s[o+1],m=s[o+2],g=s[o+3];return e[t]=a*g+u*h+c*m-l*f,e[t+1]=c*g+u*f+l*h-a*m,e[t+2]=l*g+u*m+a*f-c*h,e[t+3]=u*g-a*h-c*f-l*m,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,r){return this._x=e,this._y=t,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,r=e._y,s=e._z,o=e._order,a=Math.cos,c=Math.sin,l=a(i/2),u=a(r/2),h=a(s/2),f=c(i/2),m=c(r/2),g=c(s/2);switch(o){case"XYZ":this._x=f*u*h+l*m*g,this._y=l*m*h-f*u*g,this._z=l*u*g+f*m*h,this._w=l*u*h-f*m*g;break;case"YXZ":this._x=f*u*h+l*m*g,this._y=l*m*h-f*u*g,this._z=l*u*g-f*m*h,this._w=l*u*h+f*m*g;break;case"ZXY":this._x=f*u*h-l*m*g,this._y=l*m*h+f*u*g,this._z=l*u*g+f*m*h,this._w=l*u*h-f*m*g;break;case"ZYX":this._x=f*u*h-l*m*g,this._y=l*m*h+f*u*g,this._z=l*u*g-f*m*h,this._w=l*u*h+f*m*g;break;case"YZX":this._x=f*u*h+l*m*g,this._y=l*m*h+f*u*g,this._z=l*u*g-f*m*h,this._w=l*u*h-f*m*g;break;case"XZY":this._x=f*u*h-l*m*g,this._y=l*m*h-f*u*g,this._z=l*u*g+f*m*h,this._w=l*u*h+f*m*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],r=t[4],s=t[8],o=t[1],a=t[5],c=t[9],l=t[2],u=t[6],h=t[10],f=i+a+h;if(f>0){const m=.5/Math.sqrt(f+1);this._w=.25/m,this._x=(u-c)*m,this._y=(s-l)*m,this._z=(o-r)*m}else if(i>a&&i>h){const m=2*Math.sqrt(1+i-a-h);this._w=(u-c)/m,this._x=.25*m,this._y=(r+o)/m,this._z=(s+l)/m}else if(a>h){const m=2*Math.sqrt(1+a-i-h);this._w=(s-l)/m,this._x=(r+o)/m,this._y=.25*m,this._z=(c+u)/m}else{const m=2*Math.sqrt(1+h-i-a);this._w=(o-r)/m,this._x=(s+l)/m,this._y=(c+u)/m,this._z=.25*m}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<Number.EPSILON?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Pt(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const r=Math.min(1,t/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,r=e._y,s=e._z,o=e._w,a=t._x,c=t._y,l=t._z,u=t._w;return this._x=i*u+o*a+r*l-s*c,this._y=r*u+o*c+s*a-i*l,this._z=s*u+o*l+i*c-r*a,this._w=o*u-i*a-r*c-s*l,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const i=this._x,r=this._y,s=this._z,o=this._w;let a=o*e._w+i*e._x+r*e._y+s*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=i,this._y=r,this._z=s,this;const c=1-a*a;if(c<=Number.EPSILON){const m=1-t;return this._w=m*o+t*this._w,this._x=m*i+t*this._x,this._y=m*r+t*this._y,this._z=m*s+t*this._z,this.normalize(),this}const l=Math.sqrt(c),u=Math.atan2(l,a),h=Math.sin((1-t)*u)/l,f=Math.sin(t*u)/l;return this._w=o*h+this._w*f,this._x=i*h+this._x*f,this._y=r*h+this._y*f,this._z=s*h+this._z*f,this._onChangeCallback(),this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=Math.random(),t=Math.sqrt(1-e),i=Math.sqrt(e),r=2*Math.PI*Math.random(),s=2*Math.PI*Math.random();return this.set(t*Math.cos(r),i*Math.sin(s),i*Math.cos(s),t*Math.sin(r))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class N{constructor(e=0,t=0,i=0){N.prototype.isVector3=!0,this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(to.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(to.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6]*r,this.y=s[1]*t+s[4]*i+s[7]*r,this.z=s[2]*t+s[5]*i+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=e.elements,o=1/(s[3]*t+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*i+s[8]*r+s[12])*o,this.y=(s[1]*t+s[5]*i+s[9]*r+s[13])*o,this.z=(s[2]*t+s[6]*i+s[10]*r+s[14])*o,this}applyQuaternion(e){const t=this.x,i=this.y,r=this.z,s=e.x,o=e.y,a=e.z,c=e.w,l=2*(o*r-a*i),u=2*(a*t-s*r),h=2*(s*i-o*t);return this.x=t+c*l+o*h-a*u,this.y=i+c*u+a*l-s*h,this.z=r+c*h+s*u-o*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*i+s[8]*r,this.y=s[1]*t+s[5]*i+s[9]*r,this.z=s[2]*t+s[6]*i+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,r=e.y,s=e.z,o=t.x,a=t.y,c=t.z;return this.x=r*c-s*a,this.y=s*o-i*c,this.z=i*a-r*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return ns.copy(this).projectOnVector(e),this.sub(ns)}reflect(e){return this.sub(ns.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Pt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return t*t+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const r=Math.sin(t)*e;return this.x=r*Math.sin(i),this.y=Math.cos(t)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=(Math.random()-.5)*2,t=Math.random()*Math.PI*2,i=Math.sqrt(1-e**2);return this.x=i*Math.cos(t),this.y=i*Math.sin(t),this.z=e,this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const ns=new N,to=new Vi;class Wi{constructor(e=new N(1/0,1/0,1/0),t=new N(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(Wt.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(Wt.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=Wt.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const s=i.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=s.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Wt):Wt.fromBufferAttribute(s,o),Wt.applyMatrix4(e.matrixWorld),this.expandByPoint(Wt);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),$i.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),$i.copy(i.boundingBox)),$i.applyMatrix4(e.matrixWorld),this.union($i)}const r=e.children;for(let s=0,o=r.length;s<o;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y||e.z<this.min.z||e.z>this.max.z)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y||e.max.z<this.min.z||e.min.z>this.max.z)}intersectsSphere(e){return this.clampPoint(e.center,Wt),Wt.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Pi),Ki.subVectors(this.max,Pi),ei.subVectors(e.a,Pi),ti.subVectors(e.b,Pi),ni.subVectors(e.c,Pi),vn.subVectors(ti,ei),xn.subVectors(ni,ti),In.subVectors(ei,ni);let t=[0,-vn.z,vn.y,0,-xn.z,xn.y,0,-In.z,In.y,vn.z,0,-vn.x,xn.z,0,-xn.x,In.z,0,-In.x,-vn.y,vn.x,0,-xn.y,xn.x,0,-In.y,In.x,0];return!is(t,ei,ti,ni,Ki)||(t=[1,0,0,0,1,0,0,0,1],!is(t,ei,ti,ni,Ki))?!1:(Ji.crossVectors(vn,xn),t=[Ji.x,Ji.y,Ji.z],is(t,ei,ti,ni,Ki))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Wt).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Wt).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(tn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),tn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),tn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),tn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),tn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),tn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),tn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),tn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(tn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}const tn=[new N,new N,new N,new N,new N,new N,new N,new N],Wt=new N,$i=new Wi,ei=new N,ti=new N,ni=new N,vn=new N,xn=new N,In=new N,Pi=new N,Ki=new N,Ji=new N,Nn=new N;function is(n,e,t,i,r){for(let s=0,o=n.length-3;s<=o;s+=3){Nn.fromArray(n,s);const a=r.x*Math.abs(Nn.x)+r.y*Math.abs(Nn.y)+r.z*Math.abs(Nn.z),c=e.dot(Nn),l=t.dot(Nn),u=i.dot(Nn);if(Math.max(-Math.max(c,l,u),Math.min(c,l,u))>a)return!1}return!0}const Uu=new Wi,Di=new N,rs=new N;class qs{constructor(e=new N,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):Uu.setFromPoints(e).getCenter(i);let r=0;for(let s=0,o=e.length;s<o;s++)r=Math.max(r,i.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Di.subVectors(e,this.center);const t=Di.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),r=(i-this.radius)*.5;this.center.addScaledVector(Di,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(rs.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Di.copy(e.center).add(rs)),this.expandByPoint(Di.copy(e.center).sub(rs))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}}const nn=new N,ss=new N,Qi=new N,Mn=new N,as=new N,er=new N,os=new N;class Iu{constructor(e=new N,t=new N(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,nn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=nn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(nn.copy(this.origin).addScaledVector(this.direction,t),nn.distanceToSquared(e))}distanceSqToSegment(e,t,i,r){ss.copy(e).add(t).multiplyScalar(.5),Qi.copy(t).sub(e).normalize(),Mn.copy(this.origin).sub(ss);const s=e.distanceTo(t)*.5,o=-this.direction.dot(Qi),a=Mn.dot(this.direction),c=-Mn.dot(Qi),l=Mn.lengthSq(),u=Math.abs(1-o*o);let h,f,m,g;if(u>0)if(h=o*c-a,f=o*a-c,g=s*u,h>=0)if(f>=-g)if(f<=g){const v=1/u;h*=v,f*=v,m=h*(h+o*f+2*a)+f*(o*h+f+2*c)+l}else f=s,h=Math.max(0,-(o*f+a)),m=-h*h+f*(f+2*c)+l;else f=-s,h=Math.max(0,-(o*f+a)),m=-h*h+f*(f+2*c)+l;else f<=-g?(h=Math.max(0,-(-o*s+a)),f=h>0?-s:Math.min(Math.max(-s,-c),s),m=-h*h+f*(f+2*c)+l):f<=g?(h=0,f=Math.min(Math.max(-s,-c),s),m=f*(f+2*c)+l):(h=Math.max(0,-(o*s+a)),f=h>0?s:Math.min(Math.max(-s,-c),s),m=-h*h+f*(f+2*c)+l);else f=o>0?-s:s,h=Math.max(0,-(o*f+a)),m=-h*h+f*(f+2*c)+l;return i&&i.copy(this.origin).addScaledVector(this.direction,h),r&&r.copy(ss).addScaledVector(Qi,f),m}intersectSphere(e,t){nn.subVectors(e.center,this.origin);const i=nn.dot(this.direction),r=nn.dot(nn)-i*i,s=e.radius*e.radius;if(r>s)return null;const o=Math.sqrt(s-r),a=i-o,c=i+o;return c<0?null:a<0?this.at(c,t):this.at(a,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,r,s,o,a,c;const l=1/this.direction.x,u=1/this.direction.y,h=1/this.direction.z,f=this.origin;return l>=0?(i=(e.min.x-f.x)*l,r=(e.max.x-f.x)*l):(i=(e.max.x-f.x)*l,r=(e.min.x-f.x)*l),u>=0?(s=(e.min.y-f.y)*u,o=(e.max.y-f.y)*u):(s=(e.max.y-f.y)*u,o=(e.min.y-f.y)*u),i>o||s>r||((s>i||isNaN(i))&&(i=s),(o<r||isNaN(r))&&(r=o),h>=0?(a=(e.min.z-f.z)*h,c=(e.max.z-f.z)*h):(a=(e.max.z-f.z)*h,c=(e.min.z-f.z)*h),i>c||a>r)||((a>i||i!==i)&&(i=a),(c<r||r!==r)&&(r=c),r<0)?null:this.at(i>=0?i:r,t)}intersectsBox(e){return this.intersectBox(e,nn)!==null}intersectTriangle(e,t,i,r,s){as.subVectors(t,e),er.subVectors(i,e),os.crossVectors(as,er);let o=this.direction.dot(os),a;if(o>0){if(r)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Mn.subVectors(this.origin,e);const c=a*this.direction.dot(er.crossVectors(Mn,er));if(c<0)return null;const l=a*this.direction.dot(as.cross(Mn));if(l<0||c+l>o)return null;const u=-a*Mn.dot(os);return u<0?null:this.at(u/o,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class ht{constructor(e,t,i,r,s,o,a,c,l,u,h,f,m,g,v,p){ht.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,o,a,c,l,u,h,f,m,g,v,p)}set(e,t,i,r,s,o,a,c,l,u,h,f,m,g,v,p){const d=this.elements;return d[0]=e,d[4]=t,d[8]=i,d[12]=r,d[1]=s,d[5]=o,d[9]=a,d[13]=c,d[2]=l,d[6]=u,d[10]=h,d[14]=f,d[3]=m,d[7]=g,d[11]=v,d[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ht().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,i=e.elements,r=1/ii.setFromMatrixColumn(e,0).length(),s=1/ii.setFromMatrixColumn(e,1).length(),o=1/ii.setFromMatrixColumn(e,2).length();return t[0]=i[0]*r,t[1]=i[1]*r,t[2]=i[2]*r,t[3]=0,t[4]=i[4]*s,t[5]=i[5]*s,t[6]=i[6]*s,t[7]=0,t[8]=i[8]*o,t[9]=i[9]*o,t[10]=i[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,r=e.y,s=e.z,o=Math.cos(i),a=Math.sin(i),c=Math.cos(r),l=Math.sin(r),u=Math.cos(s),h=Math.sin(s);if(e.order==="XYZ"){const f=o*u,m=o*h,g=a*u,v=a*h;t[0]=c*u,t[4]=-c*h,t[8]=l,t[1]=m+g*l,t[5]=f-v*l,t[9]=-a*c,t[2]=v-f*l,t[6]=g+m*l,t[10]=o*c}else if(e.order==="YXZ"){const f=c*u,m=c*h,g=l*u,v=l*h;t[0]=f+v*a,t[4]=g*a-m,t[8]=o*l,t[1]=o*h,t[5]=o*u,t[9]=-a,t[2]=m*a-g,t[6]=v+f*a,t[10]=o*c}else if(e.order==="ZXY"){const f=c*u,m=c*h,g=l*u,v=l*h;t[0]=f-v*a,t[4]=-o*h,t[8]=g+m*a,t[1]=m+g*a,t[5]=o*u,t[9]=v-f*a,t[2]=-o*l,t[6]=a,t[10]=o*c}else if(e.order==="ZYX"){const f=o*u,m=o*h,g=a*u,v=a*h;t[0]=c*u,t[4]=g*l-m,t[8]=f*l+v,t[1]=c*h,t[5]=v*l+f,t[9]=m*l-g,t[2]=-l,t[6]=a*c,t[10]=o*c}else if(e.order==="YZX"){const f=o*c,m=o*l,g=a*c,v=a*l;t[0]=c*u,t[4]=v-f*h,t[8]=g*h+m,t[1]=h,t[5]=o*u,t[9]=-a*u,t[2]=-l*u,t[6]=m*h+g,t[10]=f-v*h}else if(e.order==="XZY"){const f=o*c,m=o*l,g=a*c,v=a*l;t[0]=c*u,t[4]=-h,t[8]=l*u,t[1]=f*h+v,t[5]=o*u,t[9]=m*h-g,t[2]=g*h-m,t[6]=a*u,t[10]=v*h+f}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Nu,e,Ou)}lookAt(e,t,i){const r=this.elements;return Nt.subVectors(e,t),Nt.lengthSq()===0&&(Nt.z=1),Nt.normalize(),Sn.crossVectors(i,Nt),Sn.lengthSq()===0&&(Math.abs(i.z)===1?Nt.x+=1e-4:Nt.z+=1e-4,Nt.normalize(),Sn.crossVectors(i,Nt)),Sn.normalize(),tr.crossVectors(Nt,Sn),r[0]=Sn.x,r[4]=tr.x,r[8]=Nt.x,r[1]=Sn.y,r[5]=tr.y,r[9]=Nt.y,r[2]=Sn.z,r[6]=tr.z,r[10]=Nt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,o=i[0],a=i[4],c=i[8],l=i[12],u=i[1],h=i[5],f=i[9],m=i[13],g=i[2],v=i[6],p=i[10],d=i[14],T=i[3],x=i[7],w=i[11],P=i[15],R=r[0],A=r[4],q=r[8],S=r[12],E=r[1],z=r[5],Z=r[9],ie=r[13],C=r[2],F=r[6],G=r[10],W=r[14],V=r[3],H=r[7],$=r[11],ee=r[15];return s[0]=o*R+a*E+c*C+l*V,s[4]=o*A+a*z+c*F+l*H,s[8]=o*q+a*Z+c*G+l*$,s[12]=o*S+a*ie+c*W+l*ee,s[1]=u*R+h*E+f*C+m*V,s[5]=u*A+h*z+f*F+m*H,s[9]=u*q+h*Z+f*G+m*$,s[13]=u*S+h*ie+f*W+m*ee,s[2]=g*R+v*E+p*C+d*V,s[6]=g*A+v*z+p*F+d*H,s[10]=g*q+v*Z+p*G+d*$,s[14]=g*S+v*ie+p*W+d*ee,s[3]=T*R+x*E+w*C+P*V,s[7]=T*A+x*z+w*F+P*H,s[11]=T*q+x*Z+w*G+P*$,s[15]=T*S+x*ie+w*W+P*ee,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],r=e[8],s=e[12],o=e[1],a=e[5],c=e[9],l=e[13],u=e[2],h=e[6],f=e[10],m=e[14],g=e[3],v=e[7],p=e[11],d=e[15];return g*(+s*c*h-r*l*h-s*a*f+i*l*f+r*a*m-i*c*m)+v*(+t*c*m-t*l*f+s*o*f-r*o*m+r*l*u-s*c*u)+p*(+t*l*h-t*a*m-s*o*h+i*o*m+s*a*u-i*l*u)+d*(-r*a*u-t*c*h+t*a*f+r*o*h-i*o*f+i*c*u)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],c=e[6],l=e[7],u=e[8],h=e[9],f=e[10],m=e[11],g=e[12],v=e[13],p=e[14],d=e[15],T=h*p*l-v*f*l+v*c*m-a*p*m-h*c*d+a*f*d,x=g*f*l-u*p*l-g*c*m+o*p*m+u*c*d-o*f*d,w=u*v*l-g*h*l+g*a*m-o*v*m-u*a*d+o*h*d,P=g*h*c-u*v*c-g*a*f+o*v*f+u*a*p-o*h*p,R=t*T+i*x+r*w+s*P;if(R===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const A=1/R;return e[0]=T*A,e[1]=(v*f*s-h*p*s-v*r*m+i*p*m+h*r*d-i*f*d)*A,e[2]=(a*p*s-v*c*s+v*r*l-i*p*l-a*r*d+i*c*d)*A,e[3]=(h*c*s-a*f*s-h*r*l+i*f*l+a*r*m-i*c*m)*A,e[4]=x*A,e[5]=(u*p*s-g*f*s+g*r*m-t*p*m-u*r*d+t*f*d)*A,e[6]=(g*c*s-o*p*s-g*r*l+t*p*l+o*r*d-t*c*d)*A,e[7]=(o*f*s-u*c*s+u*r*l-t*f*l-o*r*m+t*c*m)*A,e[8]=w*A,e[9]=(g*h*s-u*v*s-g*i*m+t*v*m+u*i*d-t*h*d)*A,e[10]=(o*v*s-g*a*s+g*i*l-t*v*l-o*i*d+t*a*d)*A,e[11]=(u*a*s-o*h*s-u*i*l+t*h*l+o*i*m-t*a*m)*A,e[12]=P*A,e[13]=(u*v*r-g*h*r+g*i*f-t*v*f-u*i*p+t*h*p)*A,e[14]=(g*a*r-o*v*r-g*i*c+t*v*c+o*i*p-t*a*p)*A,e[15]=(o*h*r-u*a*r+u*i*c-t*h*c-o*i*f+t*a*f)*A,this}scale(e){const t=this.elements,i=e.x,r=e.y,s=e.z;return t[0]*=i,t[4]*=r,t[8]*=s,t[1]*=i,t[5]*=r,t[9]*=s,t[2]*=i,t[6]*=r,t[10]*=s,t[3]*=i,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,r))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),r=Math.sin(t),s=1-i,o=e.x,a=e.y,c=e.z,l=s*o,u=s*a;return this.set(l*o+i,l*a-r*c,l*c+r*a,0,l*a+r*c,u*a+i,u*c-r*o,0,l*c-r*a,u*c+r*o,s*c*c+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,r,s,o){return this.set(1,i,s,0,e,1,o,0,t,r,1,0,0,0,0,1),this}compose(e,t,i){const r=this.elements,s=t._x,o=t._y,a=t._z,c=t._w,l=s+s,u=o+o,h=a+a,f=s*l,m=s*u,g=s*h,v=o*u,p=o*h,d=a*h,T=c*l,x=c*u,w=c*h,P=i.x,R=i.y,A=i.z;return r[0]=(1-(v+d))*P,r[1]=(m+w)*P,r[2]=(g-x)*P,r[3]=0,r[4]=(m-w)*R,r[5]=(1-(f+d))*R,r[6]=(p+T)*R,r[7]=0,r[8]=(g+x)*A,r[9]=(p-T)*A,r[10]=(1-(f+v))*A,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,i){const r=this.elements;let s=ii.set(r[0],r[1],r[2]).length();const o=ii.set(r[4],r[5],r[6]).length(),a=ii.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],Xt.copy(this);const l=1/s,u=1/o,h=1/a;return Xt.elements[0]*=l,Xt.elements[1]*=l,Xt.elements[2]*=l,Xt.elements[4]*=u,Xt.elements[5]*=u,Xt.elements[6]*=u,Xt.elements[8]*=h,Xt.elements[9]*=h,Xt.elements[10]*=h,t.setFromRotationMatrix(Xt),i.x=s,i.y=o,i.z=a,this}makePerspective(e,t,i,r,s,o,a=un){const c=this.elements,l=2*s/(t-e),u=2*s/(i-r),h=(t+e)/(t-e),f=(i+r)/(i-r);let m,g;if(a===un)m=-(o+s)/(o-s),g=-2*o*s/(o-s);else if(a===Pr)m=-o/(o-s),g=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=l,c[4]=0,c[8]=h,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=m,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,i,r,s,o,a=un){const c=this.elements,l=1/(t-e),u=1/(i-r),h=1/(o-s),f=(t+e)*l,m=(i+r)*u;let g,v;if(a===un)g=(o+s)*h,v=-2*h;else if(a===Pr)g=s*h,v=-1*h;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=2*l,c[4]=0,c[8]=0,c[12]=-f,c[1]=0,c[5]=2*u,c[9]=0,c[13]=-m,c[2]=0,c[6]=0,c[10]=v,c[14]=-g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<16;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}}const ii=new N,Xt=new ht,Nu=new N(0,0,0),Ou=new N(1,1,1),Sn=new N,tr=new N,Nt=new N,no=new ht,io=new Vi;class Nr{constructor(e=0,t=0,i=0,r=Nr.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,r=this._order){return this._x=e,this._y=t,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const r=e.elements,s=r[0],o=r[4],a=r[8],c=r[1],l=r[5],u=r[9],h=r[2],f=r[6],m=r[10];switch(t){case"XYZ":this._y=Math.asin(Pt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,m),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(f,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Pt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,m),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-h,s),this._z=0);break;case"ZXY":this._x=Math.asin(Pt(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-h,m),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,s));break;case"ZYX":this._y=Math.asin(-Pt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(f,m),this._z=Math.atan2(c,s)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin(Pt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-u,l),this._y=Math.atan2(-h,s)):(this._x=0,this._y=Math.atan2(a,m));break;case"XZY":this._z=Math.asin(-Pt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(f,l),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-u,m),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return no.makeRotationFromQuaternion(e),this.setFromRotationMatrix(no,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return io.setFromEuler(this),this.setFromQuaternion(io,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Nr.DEFAULT_ORDER="XYZ";class dc{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Fu=0;const ro=new N,ri=new Vi,rn=new ht,nr=new N,Ui=new N,Bu=new N,zu=new Vi,so=new N(1,0,0),ao=new N(0,1,0),oo=new N(0,0,1),ku={type:"added"},Gu={type:"removed"};class St extends Ai{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Fu++}),this.uuid=Hi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=St.DEFAULT_UP.clone();const e=new N,t=new Nr,i=new Vi,r=new N(1,1,1);function s(){i.setFromEuler(t,!1)}function o(){t.setFromQuaternion(i,void 0,!1)}t._onChange(s),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new ht},normalMatrix:{value:new We}}),this.matrix=new ht,this.matrixWorld=new ht,this.matrixAutoUpdate=St.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=St.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new dc,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ri.setFromAxisAngle(e,t),this.quaternion.multiply(ri),this}rotateOnWorldAxis(e,t){return ri.setFromAxisAngle(e,t),this.quaternion.premultiply(ri),this}rotateX(e){return this.rotateOnAxis(so,e)}rotateY(e){return this.rotateOnAxis(ao,e)}rotateZ(e){return this.rotateOnAxis(oo,e)}translateOnAxis(e,t){return ro.copy(e).applyQuaternion(this.quaternion),this.position.add(ro.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(so,e)}translateY(e){return this.translateOnAxis(ao,e)}translateZ(e){return this.translateOnAxis(oo,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(rn.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?nr.copy(e):nr.set(e,t,i);const r=this.parent;this.updateWorldMatrix(!0,!1),Ui.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?rn.lookAt(Ui,nr,this.up):rn.lookAt(nr,Ui,this.up),this.quaternion.setFromRotationMatrix(rn),r&&(rn.extractRotation(r.matrixWorld),ri.setFromRotationMatrix(rn),this.quaternion.premultiply(ri.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.parent!==null&&e.parent.remove(e),e.parent=this,this.children.push(e),e.dispatchEvent(ku)):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Gu)),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),rn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),rn.multiply(e.parent.matrixWorld)),e.applyMatrix4(rn),this.add(e),e.updateWorldMatrix(!1,!0),this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,r=this.children.length;i<r;i++){const o=this.children[i].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ui,e,Bu),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ui,zu,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,r=t.length;i<r;i++){const s=t[i];(s.matrixWorldAutoUpdate===!0||e===!0)&&s.updateMatrixWorld(e)}}updateWorldMatrix(e,t){const i=this.parent;if(e===!0&&i!==null&&i.matrixWorldAutoUpdate===!0&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),t===!0){const r=this.children;for(let s=0,o=r.length;s<o;s++){const a=r[s];a.matrixWorldAutoUpdate===!0&&a.updateWorldMatrix(!1,!0)}}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.visibility=this._visibility,r.active=this._active,r.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),r.maxGeometryCount=this._maxGeometryCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.geometryCount=this._geometryCount,r.matricesTexture=this._matricesTexture.toJSON(e),this.boundingSphere!==null&&(r.boundingSphere={center:r.boundingSphere.center.toArray(),radius:r.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:r.boundingBox.min.toArray(),max:r.boundingBox.max.toArray()}));function s(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const c=a.shapes;if(Array.isArray(c))for(let l=0,u=c.length;l<u;l++){const h=c[l];s(e.shapes,h)}else s(e.shapes,c)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(s(e.materials,this.material[c]));r.material=a}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let a=0;a<this.children.length;a++)r.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let a=0;a<this.animations.length;a++){const c=this.animations[a];r.animations.push(s(e.animations,c))}}if(t){const a=o(e.geometries),c=o(e.materials),l=o(e.textures),u=o(e.images),h=o(e.shapes),f=o(e.skeletons),m=o(e.animations),g=o(e.nodes);a.length>0&&(i.geometries=a),c.length>0&&(i.materials=c),l.length>0&&(i.textures=l),u.length>0&&(i.images=u),h.length>0&&(i.shapes=h),f.length>0&&(i.skeletons=f),m.length>0&&(i.animations=m),g.length>0&&(i.nodes=g)}return i.object=r,i;function o(a){const c=[];for(const l in a){const u=a[l];delete u.metadata,c.push(u)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const r=e.children[i];this.add(r.clone())}return this}}St.DEFAULT_UP=new N(0,1,0);St.DEFAULT_MATRIX_AUTO_UPDATE=!0;St.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const qt=new N,sn=new N,cs=new N,an=new N,si=new N,ai=new N,co=new N,ls=new N,us=new N,ds=new N;let ir=!1;class Yt{constructor(e=new N,t=new N,i=new N){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,r){r.subVectors(i,t),qt.subVectors(e,t),r.cross(qt);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,i,r,s){qt.subVectors(r,t),sn.subVectors(i,t),cs.subVectors(e,t);const o=qt.dot(qt),a=qt.dot(sn),c=qt.dot(cs),l=sn.dot(sn),u=sn.dot(cs),h=o*l-a*a;if(h===0)return s.set(0,0,0),null;const f=1/h,m=(l*c-a*u)*f,g=(o*u-a*c)*f;return s.set(1-m-g,g,m)}static containsPoint(e,t,i,r){return this.getBarycoord(e,t,i,r,an)===null?!1:an.x>=0&&an.y>=0&&an.x+an.y<=1}static getUV(e,t,i,r,s,o,a,c){return ir===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),ir=!0),this.getInterpolation(e,t,i,r,s,o,a,c)}static getInterpolation(e,t,i,r,s,o,a,c){return this.getBarycoord(e,t,i,r,an)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(s,an.x),c.addScaledVector(o,an.y),c.addScaledVector(a,an.z),c)}static isFrontFacing(e,t,i,r){return qt.subVectors(i,t),sn.subVectors(e,t),qt.cross(sn).dot(r)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,r){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,i,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return qt.subVectors(this.c,this.b),sn.subVectors(this.a,this.b),qt.cross(sn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Yt.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Yt.getBarycoord(e,this.a,this.b,this.c,t)}getUV(e,t,i,r,s){return ir===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),ir=!0),Yt.getInterpolation(e,this.a,this.b,this.c,t,i,r,s)}getInterpolation(e,t,i,r,s){return Yt.getInterpolation(e,this.a,this.b,this.c,t,i,r,s)}containsPoint(e){return Yt.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Yt.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,r=this.b,s=this.c;let o,a;si.subVectors(r,i),ai.subVectors(s,i),ls.subVectors(e,i);const c=si.dot(ls),l=ai.dot(ls);if(c<=0&&l<=0)return t.copy(i);us.subVectors(e,r);const u=si.dot(us),h=ai.dot(us);if(u>=0&&h<=u)return t.copy(r);const f=c*h-u*l;if(f<=0&&c>=0&&u<=0)return o=c/(c-u),t.copy(i).addScaledVector(si,o);ds.subVectors(e,s);const m=si.dot(ds),g=ai.dot(ds);if(g>=0&&m<=g)return t.copy(s);const v=m*l-c*g;if(v<=0&&l>=0&&g<=0)return a=l/(l-g),t.copy(i).addScaledVector(ai,a);const p=u*g-m*h;if(p<=0&&h-u>=0&&m-g>=0)return co.subVectors(s,r),a=(h-u)/(h-u+(m-g)),t.copy(r).addScaledVector(co,a);const d=1/(p+v+f);return o=v*d,a=f*d,t.copy(i).addScaledVector(si,o).addScaledVector(ai,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const hc={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},yn={h:0,s:0,l:0},rr={h:0,s:0,l:0};function hs(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}class je{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Mt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Qe.toWorkingColorSpace(this,t),this}setRGB(e,t,i,r=Qe.workingColorSpace){return this.r=e,this.g=t,this.b=i,Qe.toWorkingColorSpace(this,r),this}setHSL(e,t,i,r=Qe.workingColorSpace){if(e=Au(e,1),t=Pt(t,0,1),i=Pt(i,0,1),t===0)this.r=this.g=this.b=i;else{const s=i<=.5?i*(1+t):i+t-i*t,o=2*i-s;this.r=hs(o,s,e+1/3),this.g=hs(o,s,e),this.b=hs(o,s,e-1/3)}return Qe.toWorkingColorSpace(this,r),this}setStyle(e,t=Mt){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const o=r[1],a=r[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(s,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Mt){const i=hc[e.toLowerCase()];return i!==void 0?this.setHex(i,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=vi(e.r),this.g=vi(e.g),this.b=vi(e.b),this}copyLinearToSRGB(e){return this.r=es(e.r),this.g=es(e.g),this.b=es(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Mt){return Qe.fromWorkingColorSpace(Tt.copy(this),e),Math.round(Pt(Tt.r*255,0,255))*65536+Math.round(Pt(Tt.g*255,0,255))*256+Math.round(Pt(Tt.b*255,0,255))}getHexString(e=Mt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Qe.workingColorSpace){Qe.fromWorkingColorSpace(Tt.copy(this),t);const i=Tt.r,r=Tt.g,s=Tt.b,o=Math.max(i,r,s),a=Math.min(i,r,s);let c,l;const u=(a+o)/2;if(a===o)c=0,l=0;else{const h=o-a;switch(l=u<=.5?h/(o+a):h/(2-o-a),o){case i:c=(r-s)/h+(r<s?6:0);break;case r:c=(s-i)/h+2;break;case s:c=(i-r)/h+4;break}c/=6}return e.h=c,e.s=l,e.l=u,e}getRGB(e,t=Qe.workingColorSpace){return Qe.fromWorkingColorSpace(Tt.copy(this),t),e.r=Tt.r,e.g=Tt.g,e.b=Tt.b,e}getStyle(e=Mt){Qe.fromWorkingColorSpace(Tt.copy(this),e);const t=Tt.r,i=Tt.g,r=Tt.b;return e!==Mt?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(e,t,i){return this.getHSL(yn),this.setHSL(yn.h+e,yn.s+t,yn.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(yn),e.getHSL(rr);const i=Jr(yn.h,rr.h,t),r=Jr(yn.s,rr.s,t),s=Jr(yn.l,rr.l,t);return this.setHSL(i,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*i+s[6]*r,this.g=s[1]*t+s[4]*i+s[7]*r,this.b=s[2]*t+s[5]*i+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Tt=new je;je.NAMES=hc;let Hu=0;class Xi extends Ai{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Hu++}),this.uuid=Hi(),this.name="",this.type="Material",this.blending=gi,this.side=Ln,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Ls,this.blendDst=Ps,this.blendEquation=kn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new je(0,0,0),this.blendAlpha=0,this.depthFunc=wr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Za,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Jn,this.stencilZFail=Jn,this.stencilZPass=Jn,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==gi&&(i.blending=this.blending),this.side!==Ln&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==Ls&&(i.blendSrc=this.blendSrc),this.blendDst!==Ps&&(i.blendDst=this.blendDst),this.blendEquation!==kn&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==wr&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Za&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Jn&&(i.stencilFail=this.stencilFail),this.stencilZFail!==Jn&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==Jn&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){const o=[];for(const a in s){const c=s[a];delete c.metadata,o.push(c)}return o}if(t){const s=r(e.textures),o=r(e.images);s.length>0&&(i.textures=s),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const r=t.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=t[s].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class fc extends Xi{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new je(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=Zo,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const ut=new N,sr=new $e;class Qt{constructor(e,t,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=ja,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=An,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}get updateRange(){return console.warn("THREE.BufferAttribute: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)sr.fromBufferAttribute(this,t),sr.applyMatrix3(e),this.setXY(t,sr.x,sr.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)ut.fromBufferAttribute(this,t),ut.applyMatrix3(e),this.setXYZ(t,ut.x,ut.y,ut.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)ut.fromBufferAttribute(this,t),ut.applyMatrix4(e),this.setXYZ(t,ut.x,ut.y,ut.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)ut.fromBufferAttribute(this,t),ut.applyNormalMatrix(e),this.setXYZ(t,ut.x,ut.y,ut.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)ut.fromBufferAttribute(this,t),ut.transformDirection(e),this.setXYZ(t,ut.x,ut.y,ut.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=Li(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=Ct(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Li(t,this.array)),t}setX(e,t){return this.normalized&&(t=Ct(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Li(t,this.array)),t}setY(e,t){return this.normalized&&(t=Ct(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Li(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Ct(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Li(t,this.array)),t}setW(e,t){return this.normalized&&(t=Ct(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=Ct(t,this.array),i=Ct(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,r){return e*=this.itemSize,this.normalized&&(t=Ct(t,this.array),i=Ct(i,this.array),r=Ct(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,t,i,r,s){return e*=this.itemSize,this.normalized&&(t=Ct(t,this.array),i=Ct(i,this.array),r=Ct(r,this.array),s=Ct(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==ja&&(e.usage=this.usage),e}}class pc extends Qt{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class mc extends Qt{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class Xn extends Qt{constructor(e,t,i){super(new Float32Array(e),t,i)}}let Vu=0;const Gt=new ht,fs=new St,oi=new N,Ot=new Wi,Ii=new Wi,gt=new N;class Kn extends Ai{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Vu++}),this.uuid=Hi(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(oc(e)?mc:pc)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const s=new We().getNormalMatrix(e);i.applyNormalMatrix(s),i.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Gt.makeRotationFromQuaternion(e),this.applyMatrix4(Gt),this}rotateX(e){return Gt.makeRotationX(e),this.applyMatrix4(Gt),this}rotateY(e){return Gt.makeRotationY(e),this.applyMatrix4(Gt),this}rotateZ(e){return Gt.makeRotationZ(e),this.applyMatrix4(Gt),this}translate(e,t,i){return Gt.makeTranslation(e,t,i),this.applyMatrix4(Gt),this}scale(e,t,i){return Gt.makeScale(e,t,i),this.applyMatrix4(Gt),this}lookAt(e){return fs.lookAt(e),fs.updateMatrix(),this.applyMatrix4(fs.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(oi).negate(),this.translate(oi.x,oi.y,oi.z),this}setFromPoints(e){const t=[];for(let i=0,r=e.length;i<r;i++){const s=e[i];t.push(s.x,s.y,s.z||0)}return this.setAttribute("position",new Xn(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Wi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingBox.set(new N(-1/0,-1/0,-1/0),new N(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,r=t.length;i<r;i++){const s=t[i];Ot.setFromBufferAttribute(s),this.morphTargetsRelative?(gt.addVectors(this.boundingBox.min,Ot.min),this.boundingBox.expandByPoint(gt),gt.addVectors(this.boundingBox.max,Ot.max),this.boundingBox.expandByPoint(gt)):(this.boundingBox.expandByPoint(Ot.min),this.boundingBox.expandByPoint(Ot.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new qs);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingSphere.set(new N,1/0);return}if(e){const i=this.boundingSphere.center;if(Ot.setFromBufferAttribute(e),t)for(let s=0,o=t.length;s<o;s++){const a=t[s];Ii.setFromBufferAttribute(a),this.morphTargetsRelative?(gt.addVectors(Ot.min,Ii.min),Ot.expandByPoint(gt),gt.addVectors(Ot.max,Ii.max),Ot.expandByPoint(gt)):(Ot.expandByPoint(Ii.min),Ot.expandByPoint(Ii.max))}Ot.getCenter(i);let r=0;for(let s=0,o=e.count;s<o;s++)gt.fromBufferAttribute(e,s),r=Math.max(r,i.distanceToSquared(gt));if(t)for(let s=0,o=t.length;s<o;s++){const a=t[s],c=this.morphTargetsRelative;for(let l=0,u=a.count;l<u;l++)gt.fromBufferAttribute(a,l),c&&(oi.fromBufferAttribute(e,l),gt.add(oi)),r=Math.max(r,i.distanceToSquared(gt))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=e.array,r=t.position.array,s=t.normal.array,o=t.uv.array,a=r.length/3;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Qt(new Float32Array(4*a),4));const c=this.getAttribute("tangent").array,l=[],u=[];for(let E=0;E<a;E++)l[E]=new N,u[E]=new N;const h=new N,f=new N,m=new N,g=new $e,v=new $e,p=new $e,d=new N,T=new N;function x(E,z,Z){h.fromArray(r,E*3),f.fromArray(r,z*3),m.fromArray(r,Z*3),g.fromArray(o,E*2),v.fromArray(o,z*2),p.fromArray(o,Z*2),f.sub(h),m.sub(h),v.sub(g),p.sub(g);const ie=1/(v.x*p.y-p.x*v.y);isFinite(ie)&&(d.copy(f).multiplyScalar(p.y).addScaledVector(m,-v.y).multiplyScalar(ie),T.copy(m).multiplyScalar(v.x).addScaledVector(f,-p.x).multiplyScalar(ie),l[E].add(d),l[z].add(d),l[Z].add(d),u[E].add(T),u[z].add(T),u[Z].add(T))}let w=this.groups;w.length===0&&(w=[{start:0,count:i.length}]);for(let E=0,z=w.length;E<z;++E){const Z=w[E],ie=Z.start,C=Z.count;for(let F=ie,G=ie+C;F<G;F+=3)x(i[F+0],i[F+1],i[F+2])}const P=new N,R=new N,A=new N,q=new N;function S(E){A.fromArray(s,E*3),q.copy(A);const z=l[E];P.copy(z),P.sub(A.multiplyScalar(A.dot(z))).normalize(),R.crossVectors(q,z);const ie=R.dot(u[E])<0?-1:1;c[E*4]=P.x,c[E*4+1]=P.y,c[E*4+2]=P.z,c[E*4+3]=ie}for(let E=0,z=w.length;E<z;++E){const Z=w[E],ie=Z.start,C=Z.count;for(let F=ie,G=ie+C;F<G;F+=3)S(i[F+0]),S(i[F+1]),S(i[F+2])}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new Qt(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let f=0,m=i.count;f<m;f++)i.setXYZ(f,0,0,0);const r=new N,s=new N,o=new N,a=new N,c=new N,l=new N,u=new N,h=new N;if(e)for(let f=0,m=e.count;f<m;f+=3){const g=e.getX(f+0),v=e.getX(f+1),p=e.getX(f+2);r.fromBufferAttribute(t,g),s.fromBufferAttribute(t,v),o.fromBufferAttribute(t,p),u.subVectors(o,s),h.subVectors(r,s),u.cross(h),a.fromBufferAttribute(i,g),c.fromBufferAttribute(i,v),l.fromBufferAttribute(i,p),a.add(u),c.add(u),l.add(u),i.setXYZ(g,a.x,a.y,a.z),i.setXYZ(v,c.x,c.y,c.z),i.setXYZ(p,l.x,l.y,l.z)}else for(let f=0,m=t.count;f<m;f+=3)r.fromBufferAttribute(t,f+0),s.fromBufferAttribute(t,f+1),o.fromBufferAttribute(t,f+2),u.subVectors(o,s),h.subVectors(r,s),u.cross(h),i.setXYZ(f+0,u.x,u.y,u.z),i.setXYZ(f+1,u.x,u.y,u.z),i.setXYZ(f+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)gt.fromBufferAttribute(e,t),gt.normalize(),e.setXYZ(t,gt.x,gt.y,gt.z)}toNonIndexed(){function e(a,c){const l=a.array,u=a.itemSize,h=a.normalized,f=new l.constructor(c.length*u);let m=0,g=0;for(let v=0,p=c.length;v<p;v++){a.isInterleavedBufferAttribute?m=c[v]*a.data.stride+a.offset:m=c[v]*u;for(let d=0;d<u;d++)f[g++]=l[m++]}return new Qt(f,u,h)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Kn,i=this.index.array,r=this.attributes;for(const a in r){const c=r[a],l=e(c,i);t.setAttribute(a,l)}const s=this.morphAttributes;for(const a in s){const c=[],l=s[a];for(let u=0,h=l.length;u<h;u++){const f=l[u],m=e(f,i);c.push(m)}t.morphAttributes[a]=c}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,c=o.length;a<c;a++){const l=o[a];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){const e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const c in i){const l=i[c];e.data.attributes[c]=l.toJSON(e.data)}const r={};let s=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],u=[];for(let h=0,f=l.length;h<f;h++){const m=l[h];u.push(m.toJSON(e.data))}u.length>0&&(r[c]=u,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone(t));const r=e.attributes;for(const l in r){const u=r[l];this.setAttribute(l,u.clone(t))}const s=e.morphAttributes;for(const l in s){const u=[],h=s[l];for(let f=0,m=h.length;f<m;f++)u.push(h[f].clone(t));this.morphAttributes[l]=u}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let l=0,u=o.length;l<u;l++){const h=o[l];this.addGroup(h.start,h.count,h.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const lo=new ht,On=new Iu,ar=new qs,uo=new N,ci=new N,li=new N,ui=new N,ps=new N,or=new N,cr=new $e,lr=new $e,ur=new $e,ho=new N,fo=new N,po=new N,dr=new N,hr=new N;class dn extends St{constructor(e=new Kn,t=new fc){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){const a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(e,t){const i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,o=i.morphTargetsRelative;t.fromBufferAttribute(r,e);const a=this.morphTargetInfluences;if(s&&a){or.set(0,0,0);for(let c=0,l=s.length;c<l;c++){const u=a[c],h=s[c];u!==0&&(ps.fromBufferAttribute(h,e),o?or.addScaledVector(ps,u):or.addScaledVector(ps.sub(t),u))}t.add(or)}return t}raycast(e,t){const i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),ar.copy(i.boundingSphere),ar.applyMatrix4(s),On.copy(e.ray).recast(e.near),!(ar.containsPoint(On.origin)===!1&&(On.intersectSphere(ar,uo)===null||On.origin.distanceToSquared(uo)>(e.far-e.near)**2))&&(lo.copy(s).invert(),On.copy(e.ray).applyMatrix4(lo),!(i.boundingBox!==null&&On.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,On)))}_computeIntersections(e,t,i){let r;const s=this.geometry,o=this.material,a=s.index,c=s.attributes.position,l=s.attributes.uv,u=s.attributes.uv1,h=s.attributes.normal,f=s.groups,m=s.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,v=f.length;g<v;g++){const p=f[g],d=o[p.materialIndex],T=Math.max(p.start,m.start),x=Math.min(a.count,Math.min(p.start+p.count,m.start+m.count));for(let w=T,P=x;w<P;w+=3){const R=a.getX(w),A=a.getX(w+1),q=a.getX(w+2);r=fr(this,d,e,i,l,u,h,R,A,q),r&&(r.faceIndex=Math.floor(w/3),r.face.materialIndex=p.materialIndex,t.push(r))}}else{const g=Math.max(0,m.start),v=Math.min(a.count,m.start+m.count);for(let p=g,d=v;p<d;p+=3){const T=a.getX(p),x=a.getX(p+1),w=a.getX(p+2);r=fr(this,o,e,i,l,u,h,T,x,w),r&&(r.faceIndex=Math.floor(p/3),t.push(r))}}else if(c!==void 0)if(Array.isArray(o))for(let g=0,v=f.length;g<v;g++){const p=f[g],d=o[p.materialIndex],T=Math.max(p.start,m.start),x=Math.min(c.count,Math.min(p.start+p.count,m.start+m.count));for(let w=T,P=x;w<P;w+=3){const R=w,A=w+1,q=w+2;r=fr(this,d,e,i,l,u,h,R,A,q),r&&(r.faceIndex=Math.floor(w/3),r.face.materialIndex=p.materialIndex,t.push(r))}}else{const g=Math.max(0,m.start),v=Math.min(c.count,m.start+m.count);for(let p=g,d=v;p<d;p+=3){const T=p,x=p+1,w=p+2;r=fr(this,o,e,i,l,u,h,T,x,w),r&&(r.faceIndex=Math.floor(p/3),t.push(r))}}}}function Wu(n,e,t,i,r,s,o,a){let c;if(e.side===Ut?c=i.intersectTriangle(o,s,r,!0,a):c=i.intersectTriangle(r,s,o,e.side===Ln,a),c===null)return null;hr.copy(a),hr.applyMatrix4(n.matrixWorld);const l=t.ray.origin.distanceTo(hr);return l<t.near||l>t.far?null:{distance:l,point:hr.clone(),object:n}}function fr(n,e,t,i,r,s,o,a,c,l){n.getVertexPosition(a,ci),n.getVertexPosition(c,li),n.getVertexPosition(l,ui);const u=Wu(n,e,t,i,ci,li,ui,dr);if(u){r&&(cr.fromBufferAttribute(r,a),lr.fromBufferAttribute(r,c),ur.fromBufferAttribute(r,l),u.uv=Yt.getInterpolation(dr,ci,li,ui,cr,lr,ur,new $e)),s&&(cr.fromBufferAttribute(s,a),lr.fromBufferAttribute(s,c),ur.fromBufferAttribute(s,l),u.uv1=Yt.getInterpolation(dr,ci,li,ui,cr,lr,ur,new $e),u.uv2=u.uv1),o&&(ho.fromBufferAttribute(o,a),fo.fromBufferAttribute(o,c),po.fromBufferAttribute(o,l),u.normal=Yt.getInterpolation(dr,ci,li,ui,ho,fo,po,new N),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));const h={a,b:c,c:l,normal:new N,materialIndex:0};Yt.getNormal(ci,li,ui,h.normal),u.face=h}return u}class wi extends Kn{constructor(e=1,t=1,i=1,r=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:r,heightSegments:s,depthSegments:o};const a=this;r=Math.floor(r),s=Math.floor(s),o=Math.floor(o);const c=[],l=[],u=[],h=[];let f=0,m=0;g("z","y","x",-1,-1,i,t,e,o,s,0),g("z","y","x",1,-1,i,t,-e,o,s,1),g("x","z","y",1,1,e,i,t,r,o,2),g("x","z","y",1,-1,e,i,-t,r,o,3),g("x","y","z",1,-1,e,t,i,r,s,4),g("x","y","z",-1,-1,e,t,-i,r,s,5),this.setIndex(c),this.setAttribute("position",new Xn(l,3)),this.setAttribute("normal",new Xn(u,3)),this.setAttribute("uv",new Xn(h,2));function g(v,p,d,T,x,w,P,R,A,q,S){const E=w/A,z=P/q,Z=w/2,ie=P/2,C=R/2,F=A+1,G=q+1;let W=0,V=0;const H=new N;for(let $=0;$<G;$++){const ee=$*z-ie;for(let ue=0;ue<F;ue++){const k=ue*E-Z;H[v]=k*T,H[p]=ee*x,H[d]=C,l.push(H.x,H.y,H.z),H[v]=0,H[p]=0,H[d]=R>0?1:-1,u.push(H.x,H.y,H.z),h.push(ue/A),h.push(1-$/q),W+=1}}for(let $=0;$<q;$++)for(let ee=0;ee<A;ee++){const ue=f+ee+F*$,k=f+ee+F*($+1),X=f+(ee+1)+F*($+1),ce=f+(ee+1)+F*$;c.push(ue,k,ce),c.push(k,X,ce),V+=6}a.addGroup(m,V,S),m+=V,f+=W}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new wi(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function bi(n){const e={};for(const t in n){e[t]={};for(const i in n[t]){const r=n[t][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=r.clone():Array.isArray(r)?e[t][i]=r.slice():e[t][i]=r}}return e}function Rt(n){const e={};for(let t=0;t<n.length;t++){const i=bi(n[t]);for(const r in i)e[r]=i[r]}return e}function Xu(n){const e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function _c(n){return n.getRenderTarget()===null?n.outputColorSpace:Qe.workingColorSpace}const qu={clone:bi,merge:Rt};var Yu=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Zu=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class $n extends Xi{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Yu,this.fragmentShader=Zu,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={derivatives:!1,fragDepth:!1,drawBuffers:!1,shaderTextureLOD:!1,clipCullDistance:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=bi(e.uniforms),this.uniformsGroups=Xu(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const o=this.uniforms[r].value;o&&o.isTexture?t.uniforms[r]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[r]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[r]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[r]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[r]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[r]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[r]={type:"m4",value:o.toArray()}:t.uniforms[r]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}}class gc extends St{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ht,this.projectionMatrix=new ht,this.projectionMatrixInverse=new ht,this.coordinateSystem=un}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}class Dt extends gc{constructor(e=50,t=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Fs*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Kr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Fs*2*Math.atan(Math.tan(Kr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}setViewOffset(e,t,i,r,s,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Kr*.5*this.fov)/this.zoom,i=2*t,r=this.aspect*i,s=-.5*r;const o=this.view;if(this.view!==null&&this.view.enabled){const c=o.fullWidth,l=o.fullHeight;s+=o.offsetX*r/c,t-=o.offsetY*i/l,r*=o.width/c,i*=o.height/l}const a=this.filmOffset;a!==0&&(s+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-i,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const di=-90,hi=1;class ju extends St{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new Dt(di,hi,e,t);r.layers=this.layers,this.add(r);const s=new Dt(di,hi,e,t);s.layers=this.layers,this.add(s);const o=new Dt(di,hi,e,t);o.layers=this.layers,this.add(o);const a=new Dt(di,hi,e,t);a.layers=this.layers,this.add(a);const c=new Dt(di,hi,e,t);c.layers=this.layers,this.add(c);const l=new Dt(di,hi,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,r,s,o,a,c]=t;for(const l of t)this.remove(l);if(e===un)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===Pr)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,o,a,c,l,u]=this.children,h=e.getRenderTarget(),f=e.getActiveCubeFace(),m=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const v=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,r),e.render(t,s),e.setRenderTarget(i,1,r),e.render(t,o),e.setRenderTarget(i,2,r),e.render(t,a),e.setRenderTarget(i,3,r),e.render(t,c),e.setRenderTarget(i,4,r),e.render(t,l),i.texture.generateMipmaps=v,e.setRenderTarget(i,5,r),e.render(t,u),e.setRenderTarget(h,f,m),e.xr.enabled=g,i.texture.needsPMREMUpdate=!0}}class vc extends Bt{constructor(e,t,i,r,s,o,a,c,l,u){e=e!==void 0?e:[],t=t!==void 0?t:yi,super(e,t,i,r,s,o,a,c,l,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class $u extends _n{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];t.encoding!==void 0&&(Fi("THREE.WebGLCubeRenderTarget: option.encoding has been replaced by option.colorSpace."),t.colorSpace=t.encoding===Wn?Mt:Ht),this.texture=new vc(r,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:Lt}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new wi(5,5,5),s=new $n({name:"CubemapFromEquirect",uniforms:bi(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Ut,blending:fn});s.uniforms.tEquirect.value=t;const o=new dn(r,s),a=t.minFilter;return t.minFilter===ki&&(t.minFilter=Lt),new ju(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t,i,r){const s=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,i,r);e.setRenderTarget(s)}}const ms=new N,Ku=new N,Ju=new We;class Bn{constructor(e=new N(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,r){return this.normal.set(e,t,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const r=ms.subVectors(i,t).cross(Ku.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const i=e.delta(ms),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:t.copy(e.start).addScaledVector(i,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||Ju.getNormalMatrix(e),r=this.coplanarPoint(ms).applyMatrix4(e),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Fn=new qs,pr=new N;class Ys{constructor(e=new Bn,t=new Bn,i=new Bn,r=new Bn,s=new Bn,o=new Bn){this.planes=[e,t,i,r,s,o]}set(e,t,i,r,s,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(i),a[3].copy(r),a[4].copy(s),a[5].copy(o),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=un){const i=this.planes,r=e.elements,s=r[0],o=r[1],a=r[2],c=r[3],l=r[4],u=r[5],h=r[6],f=r[7],m=r[8],g=r[9],v=r[10],p=r[11],d=r[12],T=r[13],x=r[14],w=r[15];if(i[0].setComponents(c-s,f-l,p-m,w-d).normalize(),i[1].setComponents(c+s,f+l,p+m,w+d).normalize(),i[2].setComponents(c+o,f+u,p+g,w+T).normalize(),i[3].setComponents(c-o,f-u,p-g,w-T).normalize(),i[4].setComponents(c-a,f-h,p-v,w-x).normalize(),t===un)i[5].setComponents(c+a,f+h,p+v,w+x).normalize();else if(t===Pr)i[5].setComponents(a,h,v,x).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Fn.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Fn.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Fn)}intersectsSprite(e){return Fn.center.set(0,0,0),Fn.radius=.7071067811865476,Fn.applyMatrix4(e.matrixWorld),this.intersectsSphere(Fn)}intersectsSphere(e){const t=this.planes,i=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const r=t[i];if(pr.x=r.normal.x>0?e.max.x:e.min.x,pr.y=r.normal.y>0?e.max.y:e.min.y,pr.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(pr)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function xc(){let n=null,e=!1,t=null,i=null;function r(s,o){t(s,o),i=n.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(i=n.requestAnimationFrame(r),e=!0)},stop:function(){n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){n=s}}}function Qu(n,e){const t=e.isWebGL2,i=new WeakMap;function r(l,u){const h=l.array,f=l.usage,m=h.byteLength,g=n.createBuffer();n.bindBuffer(u,g),n.bufferData(u,h,f),l.onUploadCallback();let v;if(h instanceof Float32Array)v=n.FLOAT;else if(h instanceof Uint16Array)if(l.isFloat16BufferAttribute)if(t)v=n.HALF_FLOAT;else throw new Error("THREE.WebGLAttributes: Usage of Float16BufferAttribute requires WebGL2.");else v=n.UNSIGNED_SHORT;else if(h instanceof Int16Array)v=n.SHORT;else if(h instanceof Uint32Array)v=n.UNSIGNED_INT;else if(h instanceof Int32Array)v=n.INT;else if(h instanceof Int8Array)v=n.BYTE;else if(h instanceof Uint8Array)v=n.UNSIGNED_BYTE;else if(h instanceof Uint8ClampedArray)v=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+h);return{buffer:g,type:v,bytesPerElement:h.BYTES_PER_ELEMENT,version:l.version,size:m}}function s(l,u,h){const f=u.array,m=u._updateRange,g=u.updateRanges;if(n.bindBuffer(h,l),m.count===-1&&g.length===0&&n.bufferSubData(h,0,f),g.length!==0){for(let v=0,p=g.length;v<p;v++){const d=g[v];t?n.bufferSubData(h,d.start*f.BYTES_PER_ELEMENT,f,d.start,d.count):n.bufferSubData(h,d.start*f.BYTES_PER_ELEMENT,f.subarray(d.start,d.start+d.count))}u.clearUpdateRanges()}m.count!==-1&&(t?n.bufferSubData(h,m.offset*f.BYTES_PER_ELEMENT,f,m.offset,m.count):n.bufferSubData(h,m.offset*f.BYTES_PER_ELEMENT,f.subarray(m.offset,m.offset+m.count)),m.count=-1),u.onUploadCallback()}function o(l){return l.isInterleavedBufferAttribute&&(l=l.data),i.get(l)}function a(l){l.isInterleavedBufferAttribute&&(l=l.data);const u=i.get(l);u&&(n.deleteBuffer(u.buffer),i.delete(l))}function c(l,u){if(l.isGLBufferAttribute){const f=i.get(l);(!f||f.version<l.version)&&i.set(l,{buffer:l.buffer,type:l.type,bytesPerElement:l.elementSize,version:l.version});return}l.isInterleavedBufferAttribute&&(l=l.data);const h=i.get(l);if(h===void 0)i.set(l,r(l,u));else if(h.version<l.version){if(h.size!==l.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");s(h.buffer,l,u),h.version=l.version}}return{get:o,remove:a,update:c}}class Zs extends Kn{constructor(e=1,t=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:r};const s=e/2,o=t/2,a=Math.floor(i),c=Math.floor(r),l=a+1,u=c+1,h=e/a,f=t/c,m=[],g=[],v=[],p=[];for(let d=0;d<u;d++){const T=d*f-o;for(let x=0;x<l;x++){const w=x*h-s;g.push(w,-T,0),v.push(0,0,1),p.push(x/a),p.push(1-d/c)}}for(let d=0;d<c;d++)for(let T=0;T<a;T++){const x=T+l*d,w=T+l*(d+1),P=T+1+l*(d+1),R=T+1+l*d;m.push(x,w,R),m.push(w,P,R)}this.setIndex(m),this.setAttribute("position",new Xn(g,3)),this.setAttribute("normal",new Xn(v,3)),this.setAttribute("uv",new Xn(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Zs(e.width,e.height,e.widthSegments,e.heightSegments)}}var ed=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,td=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,nd=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,id=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,rd=`#ifdef USE_ALPHATEST
	if ( diffuseColor.a < alphaTest ) discard;
#endif`,sd=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,ad=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,od=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,cd=`#ifdef USE_BATCHING
	attribute float batchId;
	uniform highp sampler2D batchingTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,ld=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( batchId );
#endif`,ud=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,dd=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,hd=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,fd=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,pd=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,md=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#pragma unroll_loop_start
	for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
		plane = clippingPlanes[ i ];
		if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
	}
	#pragma unroll_loop_end
	#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
		bool clipped = true;
		#pragma unroll_loop_start
		for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
		}
		#pragma unroll_loop_end
		if ( clipped ) discard;
	#endif
#endif`,_d=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,gd=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,vd=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,xd=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Md=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Sd=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,yd=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,Ed=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float luminance( const in vec3 rgb ) {
	const vec3 weights = vec3( 0.2126729, 0.7151522, 0.0721750 );
	return dot( weights, rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Td=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,bd=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Ad=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,wd=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Rd=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Cd=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Ld="gl_FragColor = linearToOutputTexel( gl_FragColor );",Pd=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 LinearTosRGB( in vec4 value ) {
	return sRGBTransferOETF( value );
}`,Dd=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Ud=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Id=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Nd=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Od=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Fd=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Bd=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,zd=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,kd=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Gd=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Hd=`#ifdef USE_LIGHTMAP
	vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
	vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
	reflectedLight.indirectDiffuse += lightMapIrradiance;
#endif`,Vd=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Wd=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Xd=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,qd=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	#if defined ( LEGACY_LIGHTS )
		if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
			return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
		}
		return 1.0;
	#else
		float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
		if ( cutoffDistance > 0.0 ) {
			distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
		}
		return distanceFalloff;
	#endif
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Yd=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Zd=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,jd=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,$d=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Kd=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Jd=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Qd=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,eh=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,th=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,nh=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,ih=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	gl_FragDepthEXT = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,rh=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,sh=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
		varying float vIsPerspective;
	#else
		uniform float logDepthBufFC;
	#endif
#endif`,ah=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		vFragDepth = 1.0 + gl_Position.w;
		vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
	#else
		if ( isPerspectiveMatrix( projectionMatrix ) ) {
			gl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;
			gl_Position.z *= gl_Position.w;
		}
	#endif
#endif`,oh=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,ch=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,lh=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,uh=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,dh=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,hh=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,fh=`#if defined( USE_MORPHCOLORS ) && defined( MORPHTARGETS_TEXTURE )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,ph=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
		objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
		objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
		objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
	#endif
#endif`,mh=`#ifdef USE_MORPHTARGETS
	uniform float morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
		uniform sampler2DArray morphTargetsTexture;
		uniform ivec2 morphTargetsTextureSize;
		vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
			int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
			int y = texelIndex / morphTargetsTextureSize.x;
			int x = texelIndex - y * morphTargetsTextureSize.x;
			ivec3 morphUV = ivec3( x, y, morphTargetIndex );
			return texelFetch( morphTargetsTexture, morphUV, 0 );
		}
	#else
		#ifndef USE_MORPHNORMALS
			uniform float morphTargetInfluences[ 8 ];
		#else
			uniform float morphTargetInfluences[ 4 ];
		#endif
	#endif
#endif`,_h=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		transformed += morphTarget0 * morphTargetInfluences[ 0 ];
		transformed += morphTarget1 * morphTargetInfluences[ 1 ];
		transformed += morphTarget2 * morphTargetInfluences[ 2 ];
		transformed += morphTarget3 * morphTargetInfluences[ 3 ];
		#ifndef USE_MORPHNORMALS
			transformed += morphTarget4 * morphTargetInfluences[ 4 ];
			transformed += morphTarget5 * morphTargetInfluences[ 5 ];
			transformed += morphTarget6 * morphTargetInfluences[ 6 ];
			transformed += morphTarget7 * morphTargetInfluences[ 7 ];
		#endif
	#endif
#endif`,gh=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,vh=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,xh=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Mh=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Sh=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,yh=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Eh=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Th=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,bh=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Ah=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,wh=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Rh=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec2 packDepthToRG( in highp float v ) {
	return packDepthToRGBA( v ).yx;
}
float unpackRGToDepth( const in highp vec2 v ) {
	return unpackRGBAToDepth( vec4( v.xy, 0.0, 0.0 ) );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Ch=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Lh=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Ph=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Dh=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Uh=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Ih=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Nh=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
		vec3 lightToPosition = shadowCoord.xyz;
		float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );		dp += shadowBias;
		vec3 bd3D = normalize( lightToPosition );
		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
			vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
			return (
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
			) * ( 1.0 / 9.0 );
		#else
			return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
		#endif
	}
#endif`,Oh=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Fh=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Bh=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,zh=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,kh=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Gh=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Hh=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Vh=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Wh=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Xh=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,qh=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color *= toneMappingExposure;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	return color;
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Yh=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Zh=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
		vec3 refractedRayExit = position + transmissionRay;
		vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
		vec2 refractionCoords = ndcPos.xy / ndcPos.w;
		refractionCoords += 1.0;
		refractionCoords /= 2.0;
		vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
		vec3 transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,jh=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,$h=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Kh=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Jh=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Qh=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,ef=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,tf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,nf=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,rf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,sf=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,af=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,of=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,cf=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,lf=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,uf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,df=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,hf=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,ff=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,pf=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,mf=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,_f=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,gf=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,vf=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,xf=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Mf=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Sf=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), opacity );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,yf=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ef=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Tf=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,bf=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Af=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,wf=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Rf=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Cf=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Lf=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Pf=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Df=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Uf=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Fe={alphahash_fragment:ed,alphahash_pars_fragment:td,alphamap_fragment:nd,alphamap_pars_fragment:id,alphatest_fragment:rd,alphatest_pars_fragment:sd,aomap_fragment:ad,aomap_pars_fragment:od,batching_pars_vertex:cd,batching_vertex:ld,begin_vertex:ud,beginnormal_vertex:dd,bsdfs:hd,iridescence_fragment:fd,bumpmap_pars_fragment:pd,clipping_planes_fragment:md,clipping_planes_pars_fragment:_d,clipping_planes_pars_vertex:gd,clipping_planes_vertex:vd,color_fragment:xd,color_pars_fragment:Md,color_pars_vertex:Sd,color_vertex:yd,common:Ed,cube_uv_reflection_fragment:Td,defaultnormal_vertex:bd,displacementmap_pars_vertex:Ad,displacementmap_vertex:wd,emissivemap_fragment:Rd,emissivemap_pars_fragment:Cd,colorspace_fragment:Ld,colorspace_pars_fragment:Pd,envmap_fragment:Dd,envmap_common_pars_fragment:Ud,envmap_pars_fragment:Id,envmap_pars_vertex:Nd,envmap_physical_pars_fragment:Yd,envmap_vertex:Od,fog_vertex:Fd,fog_pars_vertex:Bd,fog_fragment:zd,fog_pars_fragment:kd,gradientmap_pars_fragment:Gd,lightmap_fragment:Hd,lightmap_pars_fragment:Vd,lights_lambert_fragment:Wd,lights_lambert_pars_fragment:Xd,lights_pars_begin:qd,lights_toon_fragment:Zd,lights_toon_pars_fragment:jd,lights_phong_fragment:$d,lights_phong_pars_fragment:Kd,lights_physical_fragment:Jd,lights_physical_pars_fragment:Qd,lights_fragment_begin:eh,lights_fragment_maps:th,lights_fragment_end:nh,logdepthbuf_fragment:ih,logdepthbuf_pars_fragment:rh,logdepthbuf_pars_vertex:sh,logdepthbuf_vertex:ah,map_fragment:oh,map_pars_fragment:ch,map_particle_fragment:lh,map_particle_pars_fragment:uh,metalnessmap_fragment:dh,metalnessmap_pars_fragment:hh,morphcolor_vertex:fh,morphnormal_vertex:ph,morphtarget_pars_vertex:mh,morphtarget_vertex:_h,normal_fragment_begin:gh,normal_fragment_maps:vh,normal_pars_fragment:xh,normal_pars_vertex:Mh,normal_vertex:Sh,normalmap_pars_fragment:yh,clearcoat_normal_fragment_begin:Eh,clearcoat_normal_fragment_maps:Th,clearcoat_pars_fragment:bh,iridescence_pars_fragment:Ah,opaque_fragment:wh,packing:Rh,premultiplied_alpha_fragment:Ch,project_vertex:Lh,dithering_fragment:Ph,dithering_pars_fragment:Dh,roughnessmap_fragment:Uh,roughnessmap_pars_fragment:Ih,shadowmap_pars_fragment:Nh,shadowmap_pars_vertex:Oh,shadowmap_vertex:Fh,shadowmask_pars_fragment:Bh,skinbase_vertex:zh,skinning_pars_vertex:kh,skinning_vertex:Gh,skinnormal_vertex:Hh,specularmap_fragment:Vh,specularmap_pars_fragment:Wh,tonemapping_fragment:Xh,tonemapping_pars_fragment:qh,transmission_fragment:Yh,transmission_pars_fragment:Zh,uv_pars_fragment:jh,uv_pars_vertex:$h,uv_vertex:Kh,worldpos_vertex:Jh,background_vert:Qh,background_frag:ef,backgroundCube_vert:tf,backgroundCube_frag:nf,cube_vert:rf,cube_frag:sf,depth_vert:af,depth_frag:of,distanceRGBA_vert:cf,distanceRGBA_frag:lf,equirect_vert:uf,equirect_frag:df,linedashed_vert:hf,linedashed_frag:ff,meshbasic_vert:pf,meshbasic_frag:mf,meshlambert_vert:_f,meshlambert_frag:gf,meshmatcap_vert:vf,meshmatcap_frag:xf,meshnormal_vert:Mf,meshnormal_frag:Sf,meshphong_vert:yf,meshphong_frag:Ef,meshphysical_vert:Tf,meshphysical_frag:bf,meshtoon_vert:Af,meshtoon_frag:wf,points_vert:Rf,points_frag:Cf,shadow_vert:Lf,shadow_frag:Pf,sprite_vert:Df,sprite_frag:Uf},ne={common:{diffuse:{value:new je(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new We},alphaMap:{value:null},alphaMapTransform:{value:new We},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new We}},envmap:{envMap:{value:null},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new We}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new We}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new We},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new We},normalScale:{value:new $e(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new We},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new We}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new We}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new We}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new je(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new je(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new We},alphaTest:{value:0},uvTransform:{value:new We}},sprite:{diffuse:{value:new je(16777215)},opacity:{value:1},center:{value:new $e(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new We},alphaMap:{value:null},alphaMapTransform:{value:new We},alphaTest:{value:0}}},$t={basic:{uniforms:Rt([ne.common,ne.specularmap,ne.envmap,ne.aomap,ne.lightmap,ne.fog]),vertexShader:Fe.meshbasic_vert,fragmentShader:Fe.meshbasic_frag},lambert:{uniforms:Rt([ne.common,ne.specularmap,ne.envmap,ne.aomap,ne.lightmap,ne.emissivemap,ne.bumpmap,ne.normalmap,ne.displacementmap,ne.fog,ne.lights,{emissive:{value:new je(0)}}]),vertexShader:Fe.meshlambert_vert,fragmentShader:Fe.meshlambert_frag},phong:{uniforms:Rt([ne.common,ne.specularmap,ne.envmap,ne.aomap,ne.lightmap,ne.emissivemap,ne.bumpmap,ne.normalmap,ne.displacementmap,ne.fog,ne.lights,{emissive:{value:new je(0)},specular:{value:new je(1118481)},shininess:{value:30}}]),vertexShader:Fe.meshphong_vert,fragmentShader:Fe.meshphong_frag},standard:{uniforms:Rt([ne.common,ne.envmap,ne.aomap,ne.lightmap,ne.emissivemap,ne.bumpmap,ne.normalmap,ne.displacementmap,ne.roughnessmap,ne.metalnessmap,ne.fog,ne.lights,{emissive:{value:new je(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Fe.meshphysical_vert,fragmentShader:Fe.meshphysical_frag},toon:{uniforms:Rt([ne.common,ne.aomap,ne.lightmap,ne.emissivemap,ne.bumpmap,ne.normalmap,ne.displacementmap,ne.gradientmap,ne.fog,ne.lights,{emissive:{value:new je(0)}}]),vertexShader:Fe.meshtoon_vert,fragmentShader:Fe.meshtoon_frag},matcap:{uniforms:Rt([ne.common,ne.bumpmap,ne.normalmap,ne.displacementmap,ne.fog,{matcap:{value:null}}]),vertexShader:Fe.meshmatcap_vert,fragmentShader:Fe.meshmatcap_frag},points:{uniforms:Rt([ne.points,ne.fog]),vertexShader:Fe.points_vert,fragmentShader:Fe.points_frag},dashed:{uniforms:Rt([ne.common,ne.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Fe.linedashed_vert,fragmentShader:Fe.linedashed_frag},depth:{uniforms:Rt([ne.common,ne.displacementmap]),vertexShader:Fe.depth_vert,fragmentShader:Fe.depth_frag},normal:{uniforms:Rt([ne.common,ne.bumpmap,ne.normalmap,ne.displacementmap,{opacity:{value:1}}]),vertexShader:Fe.meshnormal_vert,fragmentShader:Fe.meshnormal_frag},sprite:{uniforms:Rt([ne.sprite,ne.fog]),vertexShader:Fe.sprite_vert,fragmentShader:Fe.sprite_frag},background:{uniforms:{uvTransform:{value:new We},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Fe.background_vert,fragmentShader:Fe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1}},vertexShader:Fe.backgroundCube_vert,fragmentShader:Fe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Fe.cube_vert,fragmentShader:Fe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Fe.equirect_vert,fragmentShader:Fe.equirect_frag},distanceRGBA:{uniforms:Rt([ne.common,ne.displacementmap,{referencePosition:{value:new N},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Fe.distanceRGBA_vert,fragmentShader:Fe.distanceRGBA_frag},shadow:{uniforms:Rt([ne.lights,ne.fog,{color:{value:new je(0)},opacity:{value:1}}]),vertexShader:Fe.shadow_vert,fragmentShader:Fe.shadow_frag}};$t.physical={uniforms:Rt([$t.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new We},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new We},clearcoatNormalScale:{value:new $e(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new We},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new We},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new We},sheen:{value:0},sheenColor:{value:new je(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new We},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new We},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new We},transmissionSamplerSize:{value:new $e},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new We},attenuationDistance:{value:0},attenuationColor:{value:new je(0)},specularColor:{value:new je(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new We},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new We},anisotropyVector:{value:new $e},anisotropyMap:{value:null},anisotropyMapTransform:{value:new We}}]),vertexShader:Fe.meshphysical_vert,fragmentShader:Fe.meshphysical_frag};const mr={r:0,b:0,g:0};function If(n,e,t,i,r,s,o){const a=new je(0);let c=s===!0?0:1,l,u,h=null,f=0,m=null;function g(p,d){let T=!1,x=d.isScene===!0?d.background:null;x&&x.isTexture&&(x=(d.backgroundBlurriness>0?t:e).get(x)),x===null?v(a,c):x&&x.isColor&&(v(x,1),T=!0);const w=n.xr.getEnvironmentBlendMode();w==="additive"?i.buffers.color.setClear(0,0,0,1,o):w==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(n.autoClear||T)&&n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil),x&&(x.isCubeTexture||x.mapping===Ur)?(u===void 0&&(u=new dn(new wi(1,1,1),new $n({name:"BackgroundCubeMaterial",uniforms:bi($t.backgroundCube.uniforms),vertexShader:$t.backgroundCube.vertexShader,fragmentShader:$t.backgroundCube.fragmentShader,side:Ut,depthTest:!1,depthWrite:!1,fog:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(P,R,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(u)),u.material.uniforms.envMap.value=x,u.material.uniforms.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=d.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=d.backgroundIntensity,u.material.toneMapped=Qe.getTransfer(x.colorSpace)!==it,(h!==x||f!==x.version||m!==n.toneMapping)&&(u.material.needsUpdate=!0,h=x,f=x.version,m=n.toneMapping),u.layers.enableAll(),p.unshift(u,u.geometry,u.material,0,0,null)):x&&x.isTexture&&(l===void 0&&(l=new dn(new Zs(2,2),new $n({name:"BackgroundMaterial",uniforms:bi($t.background.uniforms),vertexShader:$t.background.vertexShader,fragmentShader:$t.background.fragmentShader,side:Ln,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(l)),l.material.uniforms.t2D.value=x,l.material.uniforms.backgroundIntensity.value=d.backgroundIntensity,l.material.toneMapped=Qe.getTransfer(x.colorSpace)!==it,x.matrixAutoUpdate===!0&&x.updateMatrix(),l.material.uniforms.uvTransform.value.copy(x.matrix),(h!==x||f!==x.version||m!==n.toneMapping)&&(l.material.needsUpdate=!0,h=x,f=x.version,m=n.toneMapping),l.layers.enableAll(),p.unshift(l,l.geometry,l.material,0,0,null))}function v(p,d){p.getRGB(mr,_c(n)),i.buffers.color.setClear(mr.r,mr.g,mr.b,d,o)}return{getClearColor:function(){return a},setClearColor:function(p,d=1){a.set(p),c=d,v(a,c)},getClearAlpha:function(){return c},setClearAlpha:function(p){c=p,v(a,c)},render:g}}function Nf(n,e,t,i){const r=n.getParameter(n.MAX_VERTEX_ATTRIBS),s=i.isWebGL2?null:e.get("OES_vertex_array_object"),o=i.isWebGL2||s!==null,a={},c=p(null);let l=c,u=!1;function h(C,F,G,W,V){let H=!1;if(o){const $=v(W,G,F);l!==$&&(l=$,m(l.object)),H=d(C,W,G,V),H&&T(C,W,G,V)}else{const $=F.wireframe===!0;(l.geometry!==W.id||l.program!==G.id||l.wireframe!==$)&&(l.geometry=W.id,l.program=G.id,l.wireframe=$,H=!0)}V!==null&&t.update(V,n.ELEMENT_ARRAY_BUFFER),(H||u)&&(u=!1,q(C,F,G,W),V!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,t.get(V).buffer))}function f(){return i.isWebGL2?n.createVertexArray():s.createVertexArrayOES()}function m(C){return i.isWebGL2?n.bindVertexArray(C):s.bindVertexArrayOES(C)}function g(C){return i.isWebGL2?n.deleteVertexArray(C):s.deleteVertexArrayOES(C)}function v(C,F,G){const W=G.wireframe===!0;let V=a[C.id];V===void 0&&(V={},a[C.id]=V);let H=V[F.id];H===void 0&&(H={},V[F.id]=H);let $=H[W];return $===void 0&&($=p(f()),H[W]=$),$}function p(C){const F=[],G=[],W=[];for(let V=0;V<r;V++)F[V]=0,G[V]=0,W[V]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:F,enabledAttributes:G,attributeDivisors:W,object:C,attributes:{},index:null}}function d(C,F,G,W){const V=l.attributes,H=F.attributes;let $=0;const ee=G.getAttributes();for(const ue in ee)if(ee[ue].location>=0){const X=V[ue];let ce=H[ue];if(ce===void 0&&(ue==="instanceMatrix"&&C.instanceMatrix&&(ce=C.instanceMatrix),ue==="instanceColor"&&C.instanceColor&&(ce=C.instanceColor)),X===void 0||X.attribute!==ce||ce&&X.data!==ce.data)return!0;$++}return l.attributesNum!==$||l.index!==W}function T(C,F,G,W){const V={},H=F.attributes;let $=0;const ee=G.getAttributes();for(const ue in ee)if(ee[ue].location>=0){let X=H[ue];X===void 0&&(ue==="instanceMatrix"&&C.instanceMatrix&&(X=C.instanceMatrix),ue==="instanceColor"&&C.instanceColor&&(X=C.instanceColor));const ce={};ce.attribute=X,X&&X.data&&(ce.data=X.data),V[ue]=ce,$++}l.attributes=V,l.attributesNum=$,l.index=W}function x(){const C=l.newAttributes;for(let F=0,G=C.length;F<G;F++)C[F]=0}function w(C){P(C,0)}function P(C,F){const G=l.newAttributes,W=l.enabledAttributes,V=l.attributeDivisors;G[C]=1,W[C]===0&&(n.enableVertexAttribArray(C),W[C]=1),V[C]!==F&&((i.isWebGL2?n:e.get("ANGLE_instanced_arrays"))[i.isWebGL2?"vertexAttribDivisor":"vertexAttribDivisorANGLE"](C,F),V[C]=F)}function R(){const C=l.newAttributes,F=l.enabledAttributes;for(let G=0,W=F.length;G<W;G++)F[G]!==C[G]&&(n.disableVertexAttribArray(G),F[G]=0)}function A(C,F,G,W,V,H,$){$===!0?n.vertexAttribIPointer(C,F,G,V,H):n.vertexAttribPointer(C,F,G,W,V,H)}function q(C,F,G,W){if(i.isWebGL2===!1&&(C.isInstancedMesh||W.isInstancedBufferGeometry)&&e.get("ANGLE_instanced_arrays")===null)return;x();const V=W.attributes,H=G.getAttributes(),$=F.defaultAttributeValues;for(const ee in H){const ue=H[ee];if(ue.location>=0){let k=V[ee];if(k===void 0&&(ee==="instanceMatrix"&&C.instanceMatrix&&(k=C.instanceMatrix),ee==="instanceColor"&&C.instanceColor&&(k=C.instanceColor)),k!==void 0){const X=k.normalized,ce=k.itemSize,xe=t.get(k);if(xe===void 0)continue;const ve=xe.buffer,Ue=xe.type,Ne=xe.bytesPerElement,be=i.isWebGL2===!0&&(Ue===n.INT||Ue===n.UNSIGNED_INT||k.gpuType===$o);if(k.isInterleavedBufferAttribute){const Ye=k.data,D=Ye.stride,bt=k.offset;if(Ye.isInstancedInterleavedBuffer){for(let Se=0;Se<ue.locationSize;Se++)P(ue.location+Se,Ye.meshPerAttribute);C.isInstancedMesh!==!0&&W._maxInstanceCount===void 0&&(W._maxInstanceCount=Ye.meshPerAttribute*Ye.count)}else for(let Se=0;Se<ue.locationSize;Se++)w(ue.location+Se);n.bindBuffer(n.ARRAY_BUFFER,ve);for(let Se=0;Se<ue.locationSize;Se++)A(ue.location+Se,ce/ue.locationSize,Ue,X,D*Ne,(bt+ce/ue.locationSize*Se)*Ne,be)}else{if(k.isInstancedBufferAttribute){for(let Ye=0;Ye<ue.locationSize;Ye++)P(ue.location+Ye,k.meshPerAttribute);C.isInstancedMesh!==!0&&W._maxInstanceCount===void 0&&(W._maxInstanceCount=k.meshPerAttribute*k.count)}else for(let Ye=0;Ye<ue.locationSize;Ye++)w(ue.location+Ye);n.bindBuffer(n.ARRAY_BUFFER,ve);for(let Ye=0;Ye<ue.locationSize;Ye++)A(ue.location+Ye,ce/ue.locationSize,Ue,X,ce*Ne,ce/ue.locationSize*Ye*Ne,be)}}else if($!==void 0){const X=$[ee];if(X!==void 0)switch(X.length){case 2:n.vertexAttrib2fv(ue.location,X);break;case 3:n.vertexAttrib3fv(ue.location,X);break;case 4:n.vertexAttrib4fv(ue.location,X);break;default:n.vertexAttrib1fv(ue.location,X)}}}}R()}function S(){Z();for(const C in a){const F=a[C];for(const G in F){const W=F[G];for(const V in W)g(W[V].object),delete W[V];delete F[G]}delete a[C]}}function E(C){if(a[C.id]===void 0)return;const F=a[C.id];for(const G in F){const W=F[G];for(const V in W)g(W[V].object),delete W[V];delete F[G]}delete a[C.id]}function z(C){for(const F in a){const G=a[F];if(G[C.id]===void 0)continue;const W=G[C.id];for(const V in W)g(W[V].object),delete W[V];delete G[C.id]}}function Z(){ie(),u=!0,l!==c&&(l=c,m(l.object))}function ie(){c.geometry=null,c.program=null,c.wireframe=!1}return{setup:h,reset:Z,resetDefaultState:ie,dispose:S,releaseStatesOfGeometry:E,releaseStatesOfProgram:z,initAttributes:x,enableAttribute:w,disableUnusedAttributes:R}}function Of(n,e,t,i){const r=i.isWebGL2;let s;function o(u){s=u}function a(u,h){n.drawArrays(s,u,h),t.update(h,s,1)}function c(u,h,f){if(f===0)return;let m,g;if(r)m=n,g="drawArraysInstanced";else if(m=e.get("ANGLE_instanced_arrays"),g="drawArraysInstancedANGLE",m===null){console.error("THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}m[g](s,u,h,f),t.update(h,s,f)}function l(u,h,f){if(f===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let g=0;g<f;g++)this.render(u[g],h[g]);else{m.multiDrawArraysWEBGL(s,u,0,h,0,f);let g=0;for(let v=0;v<f;v++)g+=h[v];t.update(g,s,1)}}this.setMode=o,this.render=a,this.renderInstances=c,this.renderMultiDraw=l}function Ff(n,e,t){let i;function r(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){const A=e.get("EXT_texture_filter_anisotropic");i=n.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function s(A){if(A==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}const o=typeof WebGL2RenderingContext<"u"&&n.constructor.name==="WebGL2RenderingContext";let a=t.precision!==void 0?t.precision:"highp";const c=s(a);c!==a&&(console.warn("THREE.WebGLRenderer:",a,"not supported, using",c,"instead."),a=c);const l=o||e.has("WEBGL_draw_buffers"),u=t.logarithmicDepthBuffer===!0,h=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),f=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),m=n.getParameter(n.MAX_TEXTURE_SIZE),g=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),v=n.getParameter(n.MAX_VERTEX_ATTRIBS),p=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),d=n.getParameter(n.MAX_VARYING_VECTORS),T=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),x=f>0,w=o||e.has("OES_texture_float"),P=x&&w,R=o?n.getParameter(n.MAX_SAMPLES):0;return{isWebGL2:o,drawBuffers:l,getMaxAnisotropy:r,getMaxPrecision:s,precision:a,logarithmicDepthBuffer:u,maxTextures:h,maxVertexTextures:f,maxTextureSize:m,maxCubemapSize:g,maxAttributes:v,maxVertexUniforms:p,maxVaryings:d,maxFragmentUniforms:T,vertexTextures:x,floatFragmentTextures:w,floatVertexTextures:P,maxSamples:R}}function Bf(n){const e=this;let t=null,i=0,r=!1,s=!1;const o=new Bn,a=new We,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(h,f){const m=h.length!==0||f||i!==0||r;return r=f,i=h.length,m},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(h,f){t=u(h,f,0)},this.setState=function(h,f,m){const g=h.clippingPlanes,v=h.clipIntersection,p=h.clipShadows,d=n.get(h);if(!r||g===null||g.length===0||s&&!p)s?u(null):l();else{const T=s?0:i,x=T*4;let w=d.clippingState||null;c.value=w,w=u(g,f,x,m);for(let P=0;P!==x;++P)w[P]=t[P];d.clippingState=w,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=T}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function u(h,f,m,g){const v=h!==null?h.length:0;let p=null;if(v!==0){if(p=c.value,g!==!0||p===null){const d=m+v*4,T=f.matrixWorldInverse;a.getNormalMatrix(T),(p===null||p.length<d)&&(p=new Float32Array(d));for(let x=0,w=m;x!==v;++x,w+=4)o.copy(h[x]).applyMatrix4(T,a),o.normal.toArray(p,w),p[w+3]=o.constant}c.value=p,c.needsUpdate=!0}return e.numPlanes=v,e.numIntersection=0,p}}function zf(n){let e=new WeakMap;function t(o,a){return a===Ds?o.mapping=yi:a===Us&&(o.mapping=Ei),o}function i(o){if(o&&o.isTexture){const a=o.mapping;if(a===Ds||a===Us)if(e.has(o)){const c=e.get(o).texture;return t(c,o.mapping)}else{const c=o.image;if(c&&c.height>0){const l=new $u(c.height/2);return l.fromEquirectangularTexture(n,o),e.set(o,l),o.addEventListener("dispose",r),t(l.texture,o.mapping)}else return null}}return o}function r(o){const a=o.target;a.removeEventListener("dispose",r);const c=e.get(a);c!==void 0&&(e.delete(a),c.dispose())}function s(){e=new WeakMap}return{get:i,dispose:s}}class Mc extends gc{constructor(e=-1,t=1,i=1,r=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=r,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,r,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=i-e,o=i+e,a=r+t,c=r-t;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=l*this.view.offsetX,o=s+l*this.view.width,a-=u*this.view.offsetY,c=a-u*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,c,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}const mi=4,mo=[.125,.215,.35,.446,.526,.582],Gn=20,_s=new Mc,_o=new je;let gs=null,vs=0,xs=0;const zn=(1+Math.sqrt(5))/2,fi=1/zn,go=[new N(1,1,1),new N(-1,1,1),new N(1,1,-1),new N(-1,1,-1),new N(0,zn,fi),new N(0,zn,-fi),new N(fi,0,zn),new N(-fi,0,zn),new N(zn,fi,0),new N(-zn,fi,0)];class vo{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,i=.1,r=100){gs=this._renderer.getRenderTarget(),vs=this._renderer.getActiveCubeFace(),xs=this._renderer.getActiveMipmapLevel(),this._setSize(256);const s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,i,r,s),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=So(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Mo(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(gs,vs,xs),e.scissorTest=!1,_r(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===yi||e.mapping===Ei?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),gs=this._renderer.getRenderTarget(),vs=this._renderer.getActiveCubeFace(),xs=this._renderer.getActiveMipmapLevel();const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Lt,minFilter:Lt,generateMipmaps:!1,type:Gi,format:Ft,colorSpace:mn,depthBuffer:!1},r=xo(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=xo(e,t,i);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=kf(s)),this._blurMaterial=Gf(s,e,t)}return r}_compileMaterial(e){const t=new dn(this._lodPlanes[0],e);this._renderer.compile(t,_s)}_sceneToCubeUV(e,t,i,r){const a=new Dt(90,1,t,i),c=[1,-1,1,1,1,1],l=[1,1,1,-1,-1,-1],u=this._renderer,h=u.autoClear,f=u.toneMapping;u.getClearColor(_o),u.toneMapping=wn,u.autoClear=!1;const m=new fc({name:"PMREM.Background",side:Ut,depthWrite:!1,depthTest:!1}),g=new dn(new wi,m);let v=!1;const p=e.background;p?p.isColor&&(m.color.copy(p),e.background=null,v=!0):(m.color.copy(_o),v=!0);for(let d=0;d<6;d++){const T=d%3;T===0?(a.up.set(0,c[d],0),a.lookAt(l[d],0,0)):T===1?(a.up.set(0,0,c[d]),a.lookAt(0,l[d],0)):(a.up.set(0,c[d],0),a.lookAt(0,0,l[d]));const x=this._cubeSize;_r(r,T*x,d>2?x:0,x,x),u.setRenderTarget(r),v&&u.render(g,a),u.render(e,a)}g.geometry.dispose(),g.material.dispose(),u.toneMapping=f,u.autoClear=h,e.background=p}_textureToCubeUV(e,t){const i=this._renderer,r=e.mapping===yi||e.mapping===Ei;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=So()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Mo());const s=r?this._cubemapMaterial:this._equirectMaterial,o=new dn(this._lodPlanes[0],s),a=s.uniforms;a.envMap.value=e;const c=this._cubeSize;_r(t,0,0,3*c,2*c),i.setRenderTarget(t),i.render(o,_s)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;for(let r=1;r<this._lodPlanes.length;r++){const s=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),o=go[(r-1)%go.length];this._blur(e,r-1,r,s,o)}t.autoClear=i}_blur(e,t,i,r,s){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,i,r,"latitudinal",s),this._halfBlur(o,e,i,i,r,"longitudinal",s)}_halfBlur(e,t,i,r,s,o,a){const c=this._renderer,l=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const u=3,h=new dn(this._lodPlanes[r],l),f=l.uniforms,m=this._sizeLods[i]-1,g=isFinite(s)?Math.PI/(2*m):2*Math.PI/(2*Gn-1),v=s/g,p=isFinite(s)?1+Math.floor(u*v):Gn;p>Gn&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${Gn}`);const d=[];let T=0;for(let A=0;A<Gn;++A){const q=A/v,S=Math.exp(-q*q/2);d.push(S),A===0?T+=S:A<p&&(T+=2*S)}for(let A=0;A<d.length;A++)d[A]=d[A]/T;f.envMap.value=e.texture,f.samples.value=p,f.weights.value=d,f.latitudinal.value=o==="latitudinal",a&&(f.poleAxis.value=a);const{_lodMax:x}=this;f.dTheta.value=g,f.mipInt.value=x-i;const w=this._sizeLods[r],P=3*w*(r>x-mi?r-x+mi:0),R=4*(this._cubeSize-w);_r(t,P,R,3*w,2*w),c.setRenderTarget(t),c.render(h,_s)}}function kf(n){const e=[],t=[],i=[];let r=n;const s=n-mi+1+mo.length;for(let o=0;o<s;o++){const a=Math.pow(2,r);t.push(a);let c=1/a;o>n-mi?c=mo[o-n+mi-1]:o===0&&(c=0),i.push(c);const l=1/(a-2),u=-l,h=1+l,f=[u,u,h,u,h,h,u,u,h,h,u,h],m=6,g=6,v=3,p=2,d=1,T=new Float32Array(v*g*m),x=new Float32Array(p*g*m),w=new Float32Array(d*g*m);for(let R=0;R<m;R++){const A=R%3*2/3-1,q=R>2?0:-1,S=[A,q,0,A+2/3,q,0,A+2/3,q+1,0,A,q,0,A+2/3,q+1,0,A,q+1,0];T.set(S,v*g*R),x.set(f,p*g*R);const E=[R,R,R,R,R,R];w.set(E,d*g*R)}const P=new Kn;P.setAttribute("position",new Qt(T,v)),P.setAttribute("uv",new Qt(x,p)),P.setAttribute("faceIndex",new Qt(w,d)),e.push(P),r>mi&&r--}return{lodPlanes:e,sizeLods:t,sigmas:i}}function xo(n,e,t){const i=new _n(n,e,t);return i.texture.mapping=Ur,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function _r(n,e,t,i,r){n.viewport.set(e,t,i,r),n.scissor.set(e,t,i,r)}function Gf(n,e,t){const i=new Float32Array(Gn),r=new N(0,1,0);return new $n({name:"SphericalGaussianBlur",defines:{n:Gn,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:js(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:fn,depthTest:!1,depthWrite:!1})}function Mo(){return new $n({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:js(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:fn,depthTest:!1,depthWrite:!1})}function So(){return new $n({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:js(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:fn,depthTest:!1,depthWrite:!1})}function js(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Hf(n){let e=new WeakMap,t=null;function i(a){if(a&&a.isTexture){const c=a.mapping,l=c===Ds||c===Us,u=c===yi||c===Ei;if(l||u)if(a.isRenderTargetTexture&&a.needsPMREMUpdate===!0){a.needsPMREMUpdate=!1;let h=e.get(a);return t===null&&(t=new vo(n)),h=l?t.fromEquirectangular(a,h):t.fromCubemap(a,h),e.set(a,h),h.texture}else{if(e.has(a))return e.get(a).texture;{const h=a.image;if(l&&h&&h.height>0||u&&h&&r(h)){t===null&&(t=new vo(n));const f=l?t.fromEquirectangular(a):t.fromCubemap(a);return e.set(a,f),a.addEventListener("dispose",s),f.texture}else return null}}}return a}function r(a){let c=0;const l=6;for(let u=0;u<l;u++)a[u]!==void 0&&c++;return c===l}function s(a){const c=a.target;c.removeEventListener("dispose",s);const l=e.get(c);l!==void 0&&(e.delete(c),l.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:o}}function Vf(n){const e={};function t(i){if(e[i]!==void 0)return e[i];let r;switch(i){case"WEBGL_depth_texture":r=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=n.getExtension(i)}return e[i]=r,r}return{has:function(i){return t(i)!==null},init:function(i){i.isWebGL2?(t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance")):(t("WEBGL_depth_texture"),t("OES_texture_float"),t("OES_texture_half_float"),t("OES_texture_half_float_linear"),t("OES_standard_derivatives"),t("OES_element_index_uint"),t("OES_vertex_array_object"),t("ANGLE_instanced_arrays")),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture")},get:function(i){const r=t(i);return r===null&&console.warn("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function Wf(n,e,t,i){const r={},s=new WeakMap;function o(h){const f=h.target;f.index!==null&&e.remove(f.index);for(const g in f.attributes)e.remove(f.attributes[g]);for(const g in f.morphAttributes){const v=f.morphAttributes[g];for(let p=0,d=v.length;p<d;p++)e.remove(v[p])}f.removeEventListener("dispose",o),delete r[f.id];const m=s.get(f);m&&(e.remove(m),s.delete(f)),i.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,t.memory.geometries--}function a(h,f){return r[f.id]===!0||(f.addEventListener("dispose",o),r[f.id]=!0,t.memory.geometries++),f}function c(h){const f=h.attributes;for(const g in f)e.update(f[g],n.ARRAY_BUFFER);const m=h.morphAttributes;for(const g in m){const v=m[g];for(let p=0,d=v.length;p<d;p++)e.update(v[p],n.ARRAY_BUFFER)}}function l(h){const f=[],m=h.index,g=h.attributes.position;let v=0;if(m!==null){const T=m.array;v=m.version;for(let x=0,w=T.length;x<w;x+=3){const P=T[x+0],R=T[x+1],A=T[x+2];f.push(P,R,R,A,A,P)}}else if(g!==void 0){const T=g.array;v=g.version;for(let x=0,w=T.length/3-1;x<w;x+=3){const P=x+0,R=x+1,A=x+2;f.push(P,R,R,A,A,P)}}else return;const p=new(oc(f)?mc:pc)(f,1);p.version=v;const d=s.get(h);d&&e.remove(d),s.set(h,p)}function u(h){const f=s.get(h);if(f){const m=h.index;m!==null&&f.version<m.version&&l(h)}else l(h);return s.get(h)}return{get:a,update:c,getWireframeAttribute:u}}function Xf(n,e,t,i){const r=i.isWebGL2;let s;function o(m){s=m}let a,c;function l(m){a=m.type,c=m.bytesPerElement}function u(m,g){n.drawElements(s,g,a,m*c),t.update(g,s,1)}function h(m,g,v){if(v===0)return;let p,d;if(r)p=n,d="drawElementsInstanced";else if(p=e.get("ANGLE_instanced_arrays"),d="drawElementsInstancedANGLE",p===null){console.error("THREE.WebGLIndexedBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}p[d](s,g,a,m*c,v),t.update(g,s,v)}function f(m,g,v){if(v===0)return;const p=e.get("WEBGL_multi_draw");if(p===null)for(let d=0;d<v;d++)this.render(m[d]/c,g[d]);else{p.multiDrawElementsWEBGL(s,g,0,a,m,0,v);let d=0;for(let T=0;T<v;T++)d+=g[T];t.update(d,s,1)}}this.setMode=o,this.setIndex=l,this.render=u,this.renderInstances=h,this.renderMultiDraw=f}function qf(n){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,o,a){switch(t.calls++,o){case n.TRIANGLES:t.triangles+=a*(s/3);break;case n.LINES:t.lines+=a*(s/2);break;case n.LINE_STRIP:t.lines+=a*(s-1);break;case n.LINE_LOOP:t.lines+=a*s;break;case n.POINTS:t.points+=a*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:i}}function Yf(n,e){return n[0]-e[0]}function Zf(n,e){return Math.abs(e[1])-Math.abs(n[1])}function jf(n,e,t){const i={},r=new Float32Array(8),s=new WeakMap,o=new vt,a=[];for(let l=0;l<8;l++)a[l]=[l,0];function c(l,u,h){const f=l.morphTargetInfluences;if(e.isWebGL2===!0){const m=u.morphAttributes.position||u.morphAttributes.normal||u.morphAttributes.color,g=m!==void 0?m.length:0;let v=s.get(u);if(v===void 0||v.count!==g){let C=function(){Z.dispose(),s.delete(u),u.removeEventListener("dispose",C)};v!==void 0&&v.texture.dispose();const T=u.morphAttributes.position!==void 0,x=u.morphAttributes.normal!==void 0,w=u.morphAttributes.color!==void 0,P=u.morphAttributes.position||[],R=u.morphAttributes.normal||[],A=u.morphAttributes.color||[];let q=0;T===!0&&(q=1),x===!0&&(q=2),w===!0&&(q=3);let S=u.attributes.position.count*q,E=1;S>e.maxTextureSize&&(E=Math.ceil(S/e.maxTextureSize),S=e.maxTextureSize);const z=new Float32Array(S*E*4*g),Z=new uc(z,S,E,g);Z.type=An,Z.needsUpdate=!0;const ie=q*4;for(let F=0;F<g;F++){const G=P[F],W=R[F],V=A[F],H=S*E*4*F;for(let $=0;$<G.count;$++){const ee=$*ie;T===!0&&(o.fromBufferAttribute(G,$),z[H+ee+0]=o.x,z[H+ee+1]=o.y,z[H+ee+2]=o.z,z[H+ee+3]=0),x===!0&&(o.fromBufferAttribute(W,$),z[H+ee+4]=o.x,z[H+ee+5]=o.y,z[H+ee+6]=o.z,z[H+ee+7]=0),w===!0&&(o.fromBufferAttribute(V,$),z[H+ee+8]=o.x,z[H+ee+9]=o.y,z[H+ee+10]=o.z,z[H+ee+11]=V.itemSize===4?o.w:1)}}v={count:g,texture:Z,size:new $e(S,E)},s.set(u,v),u.addEventListener("dispose",C)}let p=0;for(let T=0;T<f.length;T++)p+=f[T];const d=u.morphTargetsRelative?1:1-p;h.getUniforms().setValue(n,"morphTargetBaseInfluence",d),h.getUniforms().setValue(n,"morphTargetInfluences",f),h.getUniforms().setValue(n,"morphTargetsTexture",v.texture,t),h.getUniforms().setValue(n,"morphTargetsTextureSize",v.size)}else{const m=f===void 0?0:f.length;let g=i[u.id];if(g===void 0||g.length!==m){g=[];for(let x=0;x<m;x++)g[x]=[x,0];i[u.id]=g}for(let x=0;x<m;x++){const w=g[x];w[0]=x,w[1]=f[x]}g.sort(Zf);for(let x=0;x<8;x++)x<m&&g[x][1]?(a[x][0]=g[x][0],a[x][1]=g[x][1]):(a[x][0]=Number.MAX_SAFE_INTEGER,a[x][1]=0);a.sort(Yf);const v=u.morphAttributes.position,p=u.morphAttributes.normal;let d=0;for(let x=0;x<8;x++){const w=a[x],P=w[0],R=w[1];P!==Number.MAX_SAFE_INTEGER&&R?(v&&u.getAttribute("morphTarget"+x)!==v[P]&&u.setAttribute("morphTarget"+x,v[P]),p&&u.getAttribute("morphNormal"+x)!==p[P]&&u.setAttribute("morphNormal"+x,p[P]),r[x]=R,d+=R):(v&&u.hasAttribute("morphTarget"+x)===!0&&u.deleteAttribute("morphTarget"+x),p&&u.hasAttribute("morphNormal"+x)===!0&&u.deleteAttribute("morphNormal"+x),r[x]=0)}const T=u.morphTargetsRelative?1:1-d;h.getUniforms().setValue(n,"morphTargetBaseInfluence",T),h.getUniforms().setValue(n,"morphTargetInfluences",r)}}return{update:c}}function $f(n,e,t,i){let r=new WeakMap;function s(c){const l=i.render.frame,u=c.geometry,h=e.get(c,u);if(r.get(h)!==l&&(e.update(h),r.set(h,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",a)===!1&&c.addEventListener("dispose",a),r.get(c)!==l&&(t.update(c.instanceMatrix,n.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,n.ARRAY_BUFFER),r.set(c,l))),c.isSkinnedMesh){const f=c.skeleton;r.get(f)!==l&&(f.update(),r.set(f,l))}return h}function o(){r=new WeakMap}function a(c){const l=c.target;l.removeEventListener("dispose",a),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:s,dispose:o}}class Sc extends Bt{constructor(e,t,i,r,s,o,a,c,l,u){if(u=u!==void 0?u:Vn,u!==Vn&&u!==Ti)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&u===Vn&&(i=bn),i===void 0&&u===Ti&&(i=Hn),super(null,r,s,o,a,c,u,i,l),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=a!==void 0?a:xt,this.minFilter=c!==void 0?c:xt,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}const yc=new Bt,Ec=new Sc(1,1);Ec.compareFunction=ac;const Tc=new uc,bc=new Du,Ac=new vc,yo=[],Eo=[],To=new Float32Array(16),bo=new Float32Array(9),Ao=new Float32Array(4);function Ri(n,e,t){const i=n[0];if(i<=0||i>0)return n;const r=e*t;let s=yo[r];if(s===void 0&&(s=new Float32Array(r),yo[r]=s),e!==0){i.toArray(s,0);for(let o=1,a=0;o!==e;++o)a+=t,n[o].toArray(s,a)}return s}function ft(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function pt(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function Or(n,e){let t=Eo[e];t===void 0&&(t=new Int32Array(e),Eo[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function Kf(n,e){const t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function Jf(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(ft(t,e))return;n.uniform2fv(this.addr,e),pt(t,e)}}function Qf(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(ft(t,e))return;n.uniform3fv(this.addr,e),pt(t,e)}}function ep(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(ft(t,e))return;n.uniform4fv(this.addr,e),pt(t,e)}}function tp(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(ft(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),pt(t,e)}else{if(ft(t,i))return;Ao.set(i),n.uniformMatrix2fv(this.addr,!1,Ao),pt(t,i)}}function np(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(ft(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),pt(t,e)}else{if(ft(t,i))return;bo.set(i),n.uniformMatrix3fv(this.addr,!1,bo),pt(t,i)}}function ip(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(ft(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),pt(t,e)}else{if(ft(t,i))return;To.set(i),n.uniformMatrix4fv(this.addr,!1,To),pt(t,i)}}function rp(n,e){const t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function sp(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(ft(t,e))return;n.uniform2iv(this.addr,e),pt(t,e)}}function ap(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(ft(t,e))return;n.uniform3iv(this.addr,e),pt(t,e)}}function op(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(ft(t,e))return;n.uniform4iv(this.addr,e),pt(t,e)}}function cp(n,e){const t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function lp(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(ft(t,e))return;n.uniform2uiv(this.addr,e),pt(t,e)}}function up(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(ft(t,e))return;n.uniform3uiv(this.addr,e),pt(t,e)}}function dp(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(ft(t,e))return;n.uniform4uiv(this.addr,e),pt(t,e)}}function hp(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r);const s=this.type===n.SAMPLER_2D_SHADOW?Ec:yc;t.setTexture2D(e||s,r)}function fp(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture3D(e||bc,r)}function pp(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTextureCube(e||Ac,r)}function mp(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture2DArray(e||Tc,r)}function _p(n){switch(n){case 5126:return Kf;case 35664:return Jf;case 35665:return Qf;case 35666:return ep;case 35674:return tp;case 35675:return np;case 35676:return ip;case 5124:case 35670:return rp;case 35667:case 35671:return sp;case 35668:case 35672:return ap;case 35669:case 35673:return op;case 5125:return cp;case 36294:return lp;case 36295:return up;case 36296:return dp;case 35678:case 36198:case 36298:case 36306:case 35682:return hp;case 35679:case 36299:case 36307:return fp;case 35680:case 36300:case 36308:case 36293:return pp;case 36289:case 36303:case 36311:case 36292:return mp}}function gp(n,e){n.uniform1fv(this.addr,e)}function vp(n,e){const t=Ri(e,this.size,2);n.uniform2fv(this.addr,t)}function xp(n,e){const t=Ri(e,this.size,3);n.uniform3fv(this.addr,t)}function Mp(n,e){const t=Ri(e,this.size,4);n.uniform4fv(this.addr,t)}function Sp(n,e){const t=Ri(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function yp(n,e){const t=Ri(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function Ep(n,e){const t=Ri(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function Tp(n,e){n.uniform1iv(this.addr,e)}function bp(n,e){n.uniform2iv(this.addr,e)}function Ap(n,e){n.uniform3iv(this.addr,e)}function wp(n,e){n.uniform4iv(this.addr,e)}function Rp(n,e){n.uniform1uiv(this.addr,e)}function Cp(n,e){n.uniform2uiv(this.addr,e)}function Lp(n,e){n.uniform3uiv(this.addr,e)}function Pp(n,e){n.uniform4uiv(this.addr,e)}function Dp(n,e,t){const i=this.cache,r=e.length,s=Or(t,r);ft(i,s)||(n.uniform1iv(this.addr,s),pt(i,s));for(let o=0;o!==r;++o)t.setTexture2D(e[o]||yc,s[o])}function Up(n,e,t){const i=this.cache,r=e.length,s=Or(t,r);ft(i,s)||(n.uniform1iv(this.addr,s),pt(i,s));for(let o=0;o!==r;++o)t.setTexture3D(e[o]||bc,s[o])}function Ip(n,e,t){const i=this.cache,r=e.length,s=Or(t,r);ft(i,s)||(n.uniform1iv(this.addr,s),pt(i,s));for(let o=0;o!==r;++o)t.setTextureCube(e[o]||Ac,s[o])}function Np(n,e,t){const i=this.cache,r=e.length,s=Or(t,r);ft(i,s)||(n.uniform1iv(this.addr,s),pt(i,s));for(let o=0;o!==r;++o)t.setTexture2DArray(e[o]||Tc,s[o])}function Op(n){switch(n){case 5126:return gp;case 35664:return vp;case 35665:return xp;case 35666:return Mp;case 35674:return Sp;case 35675:return yp;case 35676:return Ep;case 5124:case 35670:return Tp;case 35667:case 35671:return bp;case 35668:case 35672:return Ap;case 35669:case 35673:return wp;case 5125:return Rp;case 36294:return Cp;case 36295:return Lp;case 36296:return Pp;case 35678:case 36198:case 36298:case 36306:case 35682:return Dp;case 35679:case 36299:case 36307:return Up;case 35680:case 36300:case 36308:case 36293:return Ip;case 36289:case 36303:case 36311:case 36292:return Np}}class Fp{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=_p(t.type)}}class Bp{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Op(t.type)}}class zp{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const r=this.seq;for(let s=0,o=r.length;s!==o;++s){const a=r[s];a.setValue(e,t[a.id],i)}}}const Ms=/(\w+)(\])?(\[|\.)?/g;function wo(n,e){n.seq.push(e),n.map[e.id]=e}function kp(n,e,t){const i=n.name,r=i.length;for(Ms.lastIndex=0;;){const s=Ms.exec(i),o=Ms.lastIndex;let a=s[1];const c=s[2]==="]",l=s[3];if(c&&(a=a|0),l===void 0||l==="["&&o+2===r){wo(t,l===void 0?new Fp(a,n,e):new Bp(a,n,e));break}else{let h=t.map[a];h===void 0&&(h=new zp(a),wo(t,h)),t=h}}}class gr{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){const s=e.getActiveUniform(t,r),o=e.getUniformLocation(t,s.name);kp(s,o,this)}}setValue(e,t,i,r){const s=this.map[t];s!==void 0&&s.setValue(e,i,r)}setOptional(e,t,i){const r=t[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,t,i,r){for(let s=0,o=t.length;s!==o;++s){const a=t[s],c=i[a.id];c.needsUpdate!==!1&&a.setValue(e,c.value,r)}}static seqWithValue(e,t){const i=[];for(let r=0,s=e.length;r!==s;++r){const o=e[r];o.id in t&&i.push(o)}return i}}function Ro(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}const Gp=37297;let Hp=0;function Vp(n,e){const t=n.split(`
`),i=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let o=r;o<s;o++){const a=o+1;i.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return i.join(`
`)}function Wp(n){const e=Qe.getPrimaries(Qe.workingColorSpace),t=Qe.getPrimaries(n);let i;switch(e===t?i="":e===Lr&&t===Cr?i="LinearDisplayP3ToLinearSRGB":e===Cr&&t===Lr&&(i="LinearSRGBToLinearDisplayP3"),n){case mn:case Ir:return[i,"LinearTransferOETF"];case Mt:case Xs:return[i,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",n),[i,"LinearTransferOETF"]}}function Co(n,e,t){const i=n.getShaderParameter(e,n.COMPILE_STATUS),r=n.getShaderInfoLog(e).trim();if(i&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const o=parseInt(s[1]);return t.toUpperCase()+`

`+r+`

`+Vp(n.getShaderSource(e),o)}else return r}function Xp(n,e){const t=Wp(e);return`vec4 ${n}( vec4 value ) { return ${t[0]}( ${t[1]}( value ) ); }`}function qp(n,e){let t;switch(e){case nu:t="Linear";break;case iu:t="Reinhard";break;case ru:t="OptimizedCineon";break;case su:t="ACESFilmic";break;case ou:t="AgX";break;case au:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}function Yp(n){return[n.extensionDerivatives||n.envMapCubeUVHeight||n.bumpMap||n.normalMapTangentSpace||n.clearcoatNormalMap||n.flatShading||n.shaderID==="physical"?"#extension GL_OES_standard_derivatives : enable":"",(n.extensionFragDepth||n.logarithmicDepthBuffer)&&n.rendererExtensionFragDepth?"#extension GL_EXT_frag_depth : enable":"",n.extensionDrawBuffers&&n.rendererExtensionDrawBuffers?"#extension GL_EXT_draw_buffers : require":"",(n.extensionShaderTextureLOD||n.envMap||n.transmission)&&n.rendererExtensionShaderTextureLod?"#extension GL_EXT_shader_texture_lod : enable":""].filter(_i).join(`
`)}function Zp(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":""].filter(_i).join(`
`)}function jp(n){const e=[];for(const t in n){const i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function $p(n,e){const t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){const s=n.getActiveAttrib(e,r),o=s.name;let a=1;s.type===n.FLOAT_MAT2&&(a=2),s.type===n.FLOAT_MAT3&&(a=3),s.type===n.FLOAT_MAT4&&(a=4),t[o]={type:s.type,location:n.getAttribLocation(e,o),locationSize:a}}return t}function _i(n){return n!==""}function Lo(n,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Po(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Kp=/^[ \t]*#include +<([\w\d./]+)>/gm;function zs(n){return n.replace(Kp,Qp)}const Jp=new Map([["encodings_fragment","colorspace_fragment"],["encodings_pars_fragment","colorspace_pars_fragment"],["output_fragment","opaque_fragment"]]);function Qp(n,e){let t=Fe[e];if(t===void 0){const i=Jp.get(e);if(i!==void 0)t=Fe[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return zs(t)}const em=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Do(n){return n.replace(em,tm)}function tm(n,e,t,i){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function Uo(n){let e="precision "+n.precision+` float;
precision `+n.precision+" int;";return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function nm(n){let e="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===Yo?e="SHADOWMAP_TYPE_PCF":n.shadowMapType===Ll?e="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===cn&&(e="SHADOWMAP_TYPE_VSM"),e}function im(n){let e="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case yi:case Ei:e="ENVMAP_TYPE_CUBE";break;case Ur:e="ENVMAP_TYPE_CUBE_UV";break}return e}function rm(n){let e="ENVMAP_MODE_REFLECTION";if(n.envMap)switch(n.envMapMode){case Ei:e="ENVMAP_MODE_REFRACTION";break}return e}function sm(n){let e="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case Zo:e="ENVMAP_BLENDING_MULTIPLY";break;case eu:e="ENVMAP_BLENDING_MIX";break;case tu:e="ENVMAP_BLENDING_ADD";break}return e}function am(n){const e=n.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:i,maxMip:t}}function om(n,e,t,i){const r=n.getContext(),s=t.defines;let o=t.vertexShader,a=t.fragmentShader;const c=nm(t),l=im(t),u=rm(t),h=sm(t),f=am(t),m=t.isWebGL2?"":Yp(t),g=Zp(t),v=jp(s),p=r.createProgram();let d,T,x=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(d=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v].filter(_i).join(`
`),d.length>0&&(d+=`
`),T=[m,"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v].filter(_i).join(`
`),T.length>0&&(T+=`
`)):(d=[Uo(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors&&t.isWebGL2?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_TEXTURE":"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.useLegacyLights?"#define LEGACY_LIGHTS":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(_i).join(`
`),T=[m,Uo(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+u:"",t.envMap?"#define "+h:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.useLegacyLights?"#define LEGACY_LIGHTS":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==wn?"#define TONE_MAPPING":"",t.toneMapping!==wn?Fe.tonemapping_pars_fragment:"",t.toneMapping!==wn?qp("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Fe.colorspace_pars_fragment,Xp("linearToOutputTexel",t.outputColorSpace),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(_i).join(`
`)),o=zs(o),o=Lo(o,t),o=Po(o,t),a=zs(a),a=Lo(a,t),a=Po(a,t),o=Do(o),a=Do(a),t.isWebGL2&&t.isRawShaderMaterial!==!0&&(x=`#version 300 es
`,d=[g,"precision mediump sampler2DArray;","#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+d,T=["precision mediump sampler2DArray;","#define varying in",t.glslVersion===$a?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===$a?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+T);const w=x+d+o,P=x+T+a,R=Ro(r,r.VERTEX_SHADER,w),A=Ro(r,r.FRAGMENT_SHADER,P);r.attachShader(p,R),r.attachShader(p,A),t.index0AttributeName!==void 0?r.bindAttribLocation(p,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(p,0,"position"),r.linkProgram(p);function q(Z){if(n.debug.checkShaderErrors){const ie=r.getProgramInfoLog(p).trim(),C=r.getShaderInfoLog(R).trim(),F=r.getShaderInfoLog(A).trim();let G=!0,W=!0;if(r.getProgramParameter(p,r.LINK_STATUS)===!1)if(G=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(r,p,R,A);else{const V=Co(r,R,"vertex"),H=Co(r,A,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(p,r.VALIDATE_STATUS)+`

Program Info Log: `+ie+`
`+V+`
`+H)}else ie!==""?console.warn("THREE.WebGLProgram: Program Info Log:",ie):(C===""||F==="")&&(W=!1);W&&(Z.diagnostics={runnable:G,programLog:ie,vertexShader:{log:C,prefix:d},fragmentShader:{log:F,prefix:T}})}r.deleteShader(R),r.deleteShader(A),S=new gr(r,p),E=$p(r,p)}let S;this.getUniforms=function(){return S===void 0&&q(this),S};let E;this.getAttributes=function(){return E===void 0&&q(this),E};let z=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return z===!1&&(z=r.getProgramParameter(p,Gp)),z},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(p),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Hp++,this.cacheKey=e,this.usedTimes=1,this.program=p,this.vertexShader=R,this.fragmentShader=A,this}let cm=0;class lm{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,i=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(i),o=this._getShaderCacheForMaterial(e);return o.has(r)===!1&&(o.add(r),r.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new um(e),t.set(e,i)),i}}class um{constructor(e){this.id=cm++,this.code=e,this.usedTimes=0}}function dm(n,e,t,i,r,s,o){const a=new dc,c=new lm,l=[],u=r.isWebGL2,h=r.logarithmicDepthBuffer,f=r.vertexTextures;let m=r.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function v(S){return S===0?"uv":`uv${S}`}function p(S,E,z,Z,ie){const C=Z.fog,F=ie.geometry,G=S.isMeshStandardMaterial?Z.environment:null,W=(S.isMeshStandardMaterial?t:e).get(S.envMap||G),V=W&&W.mapping===Ur?W.image.height:null,H=g[S.type];S.precision!==null&&(m=r.getMaxPrecision(S.precision),m!==S.precision&&console.warn("THREE.WebGLProgram.getParameters:",S.precision,"not supported, using",m,"instead."));const $=F.morphAttributes.position||F.morphAttributes.normal||F.morphAttributes.color,ee=$!==void 0?$.length:0;let ue=0;F.morphAttributes.position!==void 0&&(ue=1),F.morphAttributes.normal!==void 0&&(ue=2),F.morphAttributes.color!==void 0&&(ue=3);let k,X,ce,xe;if(H){const At=$t[H];k=At.vertexShader,X=At.fragmentShader}else k=S.vertexShader,X=S.fragmentShader,c.update(S),ce=c.getVertexShaderID(S),xe=c.getFragmentShaderID(S);const ve=n.getRenderTarget(),Ue=ie.isInstancedMesh===!0,Ne=ie.isBatchedMesh===!0,be=!!S.map,Ye=!!S.matcap,D=!!W,bt=!!S.aoMap,Se=!!S.lightMap,Pe=!!S.bumpMap,me=!!S.normalMap,st=!!S.displacementMap,Be=!!S.emissiveMap,y=!!S.metalnessMap,_=!!S.roughnessMap,I=S.anisotropy>0,K=S.clearcoat>0,j=S.iridescence>0,Q=S.sheen>0,_e=S.transmission>0,oe=I&&!!S.anisotropyMap,he=K&&!!S.clearcoatMap,Te=K&&!!S.clearcoatNormalMap,ze=K&&!!S.clearcoatRoughnessMap,Y=j&&!!S.iridescenceMap,Je=j&&!!S.iridescenceThicknessMap,Xe=Q&&!!S.sheenColorMap,Le=Q&&!!S.sheenRoughnessMap,Me=!!S.specularMap,fe=!!S.specularColorMap,Oe=!!S.specularIntensityMap,Ke=_e&&!!S.transmissionMap,ot=_e&&!!S.thicknessMap,He=!!S.gradientMap,te=!!S.alphaMap,b=S.alphaTest>0,re=!!S.alphaHash,se=!!S.extensions,Ae=!!F.attributes.uv1,ye=!!F.attributes.uv2,et=!!F.attributes.uv3;let tt=wn;return S.toneMapped&&(ve===null||ve.isXRRenderTarget===!0)&&(tt=n.toneMapping),{isWebGL2:u,shaderID:H,shaderType:S.type,shaderName:S.name,vertexShader:k,fragmentShader:X,defines:S.defines,customVertexShaderID:ce,customFragmentShaderID:xe,isRawShaderMaterial:S.isRawShaderMaterial===!0,glslVersion:S.glslVersion,precision:m,batching:Ne,instancing:Ue,instancingColor:Ue&&ie.instanceColor!==null,supportsVertexTextures:f,outputColorSpace:ve===null?n.outputColorSpace:ve.isXRRenderTarget===!0?ve.texture.colorSpace:mn,map:be,matcap:Ye,envMap:D,envMapMode:D&&W.mapping,envMapCubeUVHeight:V,aoMap:bt,lightMap:Se,bumpMap:Pe,normalMap:me,displacementMap:f&&st,emissiveMap:Be,normalMapObjectSpace:me&&S.normalMapType===vu,normalMapTangentSpace:me&&S.normalMapType===sc,metalnessMap:y,roughnessMap:_,anisotropy:I,anisotropyMap:oe,clearcoat:K,clearcoatMap:he,clearcoatNormalMap:Te,clearcoatRoughnessMap:ze,iridescence:j,iridescenceMap:Y,iridescenceThicknessMap:Je,sheen:Q,sheenColorMap:Xe,sheenRoughnessMap:Le,specularMap:Me,specularColorMap:fe,specularIntensityMap:Oe,transmission:_e,transmissionMap:Ke,thicknessMap:ot,gradientMap:He,opaque:S.transparent===!1&&S.blending===gi,alphaMap:te,alphaTest:b,alphaHash:re,combine:S.combine,mapUv:be&&v(S.map.channel),aoMapUv:bt&&v(S.aoMap.channel),lightMapUv:Se&&v(S.lightMap.channel),bumpMapUv:Pe&&v(S.bumpMap.channel),normalMapUv:me&&v(S.normalMap.channel),displacementMapUv:st&&v(S.displacementMap.channel),emissiveMapUv:Be&&v(S.emissiveMap.channel),metalnessMapUv:y&&v(S.metalnessMap.channel),roughnessMapUv:_&&v(S.roughnessMap.channel),anisotropyMapUv:oe&&v(S.anisotropyMap.channel),clearcoatMapUv:he&&v(S.clearcoatMap.channel),clearcoatNormalMapUv:Te&&v(S.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ze&&v(S.clearcoatRoughnessMap.channel),iridescenceMapUv:Y&&v(S.iridescenceMap.channel),iridescenceThicknessMapUv:Je&&v(S.iridescenceThicknessMap.channel),sheenColorMapUv:Xe&&v(S.sheenColorMap.channel),sheenRoughnessMapUv:Le&&v(S.sheenRoughnessMap.channel),specularMapUv:Me&&v(S.specularMap.channel),specularColorMapUv:fe&&v(S.specularColorMap.channel),specularIntensityMapUv:Oe&&v(S.specularIntensityMap.channel),transmissionMapUv:Ke&&v(S.transmissionMap.channel),thicknessMapUv:ot&&v(S.thicknessMap.channel),alphaMapUv:te&&v(S.alphaMap.channel),vertexTangents:!!F.attributes.tangent&&(me||I),vertexColors:S.vertexColors,vertexAlphas:S.vertexColors===!0&&!!F.attributes.color&&F.attributes.color.itemSize===4,vertexUv1s:Ae,vertexUv2s:ye,vertexUv3s:et,pointsUvs:ie.isPoints===!0&&!!F.attributes.uv&&(be||te),fog:!!C,useFog:S.fog===!0,fogExp2:C&&C.isFogExp2,flatShading:S.flatShading===!0,sizeAttenuation:S.sizeAttenuation===!0,logarithmicDepthBuffer:h,skinning:ie.isSkinnedMesh===!0,morphTargets:F.morphAttributes.position!==void 0,morphNormals:F.morphAttributes.normal!==void 0,morphColors:F.morphAttributes.color!==void 0,morphTargetsCount:ee,morphTextureStride:ue,numDirLights:E.directional.length,numPointLights:E.point.length,numSpotLights:E.spot.length,numSpotLightMaps:E.spotLightMap.length,numRectAreaLights:E.rectArea.length,numHemiLights:E.hemi.length,numDirLightShadows:E.directionalShadowMap.length,numPointLightShadows:E.pointShadowMap.length,numSpotLightShadows:E.spotShadowMap.length,numSpotLightShadowsWithMaps:E.numSpotLightShadowsWithMaps,numLightProbes:E.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:S.dithering,shadowMapEnabled:n.shadowMap.enabled&&z.length>0,shadowMapType:n.shadowMap.type,toneMapping:tt,useLegacyLights:n._useLegacyLights,decodeVideoTexture:be&&S.map.isVideoTexture===!0&&Qe.getTransfer(S.map.colorSpace)===it,premultipliedAlpha:S.premultipliedAlpha,doubleSided:S.side===ln,flipSided:S.side===Ut,useDepthPacking:S.depthPacking>=0,depthPacking:S.depthPacking||0,index0AttributeName:S.index0AttributeName,extensionDerivatives:se&&S.extensions.derivatives===!0,extensionFragDepth:se&&S.extensions.fragDepth===!0,extensionDrawBuffers:se&&S.extensions.drawBuffers===!0,extensionShaderTextureLOD:se&&S.extensions.shaderTextureLOD===!0,extensionClipCullDistance:se&&S.extensions.clipCullDistance&&i.has("WEBGL_clip_cull_distance"),rendererExtensionFragDepth:u||i.has("EXT_frag_depth"),rendererExtensionDrawBuffers:u||i.has("WEBGL_draw_buffers"),rendererExtensionShaderTextureLod:u||i.has("EXT_shader_texture_lod"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:S.customProgramCacheKey()}}function d(S){const E=[];if(S.shaderID?E.push(S.shaderID):(E.push(S.customVertexShaderID),E.push(S.customFragmentShaderID)),S.defines!==void 0)for(const z in S.defines)E.push(z),E.push(S.defines[z]);return S.isRawShaderMaterial===!1&&(T(E,S),x(E,S),E.push(n.outputColorSpace)),E.push(S.customProgramCacheKey),E.join()}function T(S,E){S.push(E.precision),S.push(E.outputColorSpace),S.push(E.envMapMode),S.push(E.envMapCubeUVHeight),S.push(E.mapUv),S.push(E.alphaMapUv),S.push(E.lightMapUv),S.push(E.aoMapUv),S.push(E.bumpMapUv),S.push(E.normalMapUv),S.push(E.displacementMapUv),S.push(E.emissiveMapUv),S.push(E.metalnessMapUv),S.push(E.roughnessMapUv),S.push(E.anisotropyMapUv),S.push(E.clearcoatMapUv),S.push(E.clearcoatNormalMapUv),S.push(E.clearcoatRoughnessMapUv),S.push(E.iridescenceMapUv),S.push(E.iridescenceThicknessMapUv),S.push(E.sheenColorMapUv),S.push(E.sheenRoughnessMapUv),S.push(E.specularMapUv),S.push(E.specularColorMapUv),S.push(E.specularIntensityMapUv),S.push(E.transmissionMapUv),S.push(E.thicknessMapUv),S.push(E.combine),S.push(E.fogExp2),S.push(E.sizeAttenuation),S.push(E.morphTargetsCount),S.push(E.morphAttributeCount),S.push(E.numDirLights),S.push(E.numPointLights),S.push(E.numSpotLights),S.push(E.numSpotLightMaps),S.push(E.numHemiLights),S.push(E.numRectAreaLights),S.push(E.numDirLightShadows),S.push(E.numPointLightShadows),S.push(E.numSpotLightShadows),S.push(E.numSpotLightShadowsWithMaps),S.push(E.numLightProbes),S.push(E.shadowMapType),S.push(E.toneMapping),S.push(E.numClippingPlanes),S.push(E.numClipIntersection),S.push(E.depthPacking)}function x(S,E){a.disableAll(),E.isWebGL2&&a.enable(0),E.supportsVertexTextures&&a.enable(1),E.instancing&&a.enable(2),E.instancingColor&&a.enable(3),E.matcap&&a.enable(4),E.envMap&&a.enable(5),E.normalMapObjectSpace&&a.enable(6),E.normalMapTangentSpace&&a.enable(7),E.clearcoat&&a.enable(8),E.iridescence&&a.enable(9),E.alphaTest&&a.enable(10),E.vertexColors&&a.enable(11),E.vertexAlphas&&a.enable(12),E.vertexUv1s&&a.enable(13),E.vertexUv2s&&a.enable(14),E.vertexUv3s&&a.enable(15),E.vertexTangents&&a.enable(16),E.anisotropy&&a.enable(17),E.alphaHash&&a.enable(18),E.batching&&a.enable(19),S.push(a.mask),a.disableAll(),E.fog&&a.enable(0),E.useFog&&a.enable(1),E.flatShading&&a.enable(2),E.logarithmicDepthBuffer&&a.enable(3),E.skinning&&a.enable(4),E.morphTargets&&a.enable(5),E.morphNormals&&a.enable(6),E.morphColors&&a.enable(7),E.premultipliedAlpha&&a.enable(8),E.shadowMapEnabled&&a.enable(9),E.useLegacyLights&&a.enable(10),E.doubleSided&&a.enable(11),E.flipSided&&a.enable(12),E.useDepthPacking&&a.enable(13),E.dithering&&a.enable(14),E.transmission&&a.enable(15),E.sheen&&a.enable(16),E.opaque&&a.enable(17),E.pointsUvs&&a.enable(18),E.decodeVideoTexture&&a.enable(19),S.push(a.mask)}function w(S){const E=g[S.type];let z;if(E){const Z=$t[E];z=qu.clone(Z.uniforms)}else z=S.uniforms;return z}function P(S,E){let z;for(let Z=0,ie=l.length;Z<ie;Z++){const C=l[Z];if(C.cacheKey===E){z=C,++z.usedTimes;break}}return z===void 0&&(z=new om(n,E,S,s),l.push(z)),z}function R(S){if(--S.usedTimes===0){const E=l.indexOf(S);l[E]=l[l.length-1],l.pop(),S.destroy()}}function A(S){c.remove(S)}function q(){c.dispose()}return{getParameters:p,getProgramCacheKey:d,getUniforms:w,acquireProgram:P,releaseProgram:R,releaseShaderCache:A,programs:l,dispose:q}}function hm(){let n=new WeakMap;function e(s){let o=n.get(s);return o===void 0&&(o={},n.set(s,o)),o}function t(s){n.delete(s)}function i(s,o,a){n.get(s)[o]=a}function r(){n=new WeakMap}return{get:e,remove:t,update:i,dispose:r}}function fm(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.z!==e.z?n.z-e.z:n.id-e.id}function Io(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function No(){const n=[];let e=0;const t=[],i=[],r=[];function s(){e=0,t.length=0,i.length=0,r.length=0}function o(h,f,m,g,v,p){let d=n[e];return d===void 0?(d={id:h.id,object:h,geometry:f,material:m,groupOrder:g,renderOrder:h.renderOrder,z:v,group:p},n[e]=d):(d.id=h.id,d.object=h,d.geometry=f,d.material=m,d.groupOrder=g,d.renderOrder=h.renderOrder,d.z=v,d.group=p),e++,d}function a(h,f,m,g,v,p){const d=o(h,f,m,g,v,p);m.transmission>0?i.push(d):m.transparent===!0?r.push(d):t.push(d)}function c(h,f,m,g,v,p){const d=o(h,f,m,g,v,p);m.transmission>0?i.unshift(d):m.transparent===!0?r.unshift(d):t.unshift(d)}function l(h,f){t.length>1&&t.sort(h||fm),i.length>1&&i.sort(f||Io),r.length>1&&r.sort(f||Io)}function u(){for(let h=e,f=n.length;h<f;h++){const m=n[h];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:t,transmissive:i,transparent:r,init:s,push:a,unshift:c,finish:u,sort:l}}function pm(){let n=new WeakMap;function e(i,r){const s=n.get(i);let o;return s===void 0?(o=new No,n.set(i,[o])):r>=s.length?(o=new No,s.push(o)):o=s[r],o}function t(){n=new WeakMap}return{get:e,dispose:t}}function mm(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new N,color:new je};break;case"SpotLight":t={position:new N,direction:new N,color:new je,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new N,color:new je,distance:0,decay:0};break;case"HemisphereLight":t={direction:new N,skyColor:new je,groundColor:new je};break;case"RectAreaLight":t={color:new je,position:new N,halfWidth:new N,halfHeight:new N};break}return n[e.id]=t,t}}}function _m(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new $e};break;case"SpotLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new $e};break;case"PointLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new $e,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}let gm=0;function vm(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function xm(n,e){const t=new mm,i=_m(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let u=0;u<9;u++)r.probe.push(new N);const s=new N,o=new ht,a=new ht;function c(u,h){let f=0,m=0,g=0;for(let Z=0;Z<9;Z++)r.probe[Z].set(0,0,0);let v=0,p=0,d=0,T=0,x=0,w=0,P=0,R=0,A=0,q=0,S=0;u.sort(vm);const E=h===!0?Math.PI:1;for(let Z=0,ie=u.length;Z<ie;Z++){const C=u[Z],F=C.color,G=C.intensity,W=C.distance,V=C.shadow&&C.shadow.map?C.shadow.map.texture:null;if(C.isAmbientLight)f+=F.r*G*E,m+=F.g*G*E,g+=F.b*G*E;else if(C.isLightProbe){for(let H=0;H<9;H++)r.probe[H].addScaledVector(C.sh.coefficients[H],G);S++}else if(C.isDirectionalLight){const H=t.get(C);if(H.color.copy(C.color).multiplyScalar(C.intensity*E),C.castShadow){const $=C.shadow,ee=i.get(C);ee.shadowBias=$.bias,ee.shadowNormalBias=$.normalBias,ee.shadowRadius=$.radius,ee.shadowMapSize=$.mapSize,r.directionalShadow[v]=ee,r.directionalShadowMap[v]=V,r.directionalShadowMatrix[v]=C.shadow.matrix,w++}r.directional[v]=H,v++}else if(C.isSpotLight){const H=t.get(C);H.position.setFromMatrixPosition(C.matrixWorld),H.color.copy(F).multiplyScalar(G*E),H.distance=W,H.coneCos=Math.cos(C.angle),H.penumbraCos=Math.cos(C.angle*(1-C.penumbra)),H.decay=C.decay,r.spot[d]=H;const $=C.shadow;if(C.map&&(r.spotLightMap[A]=C.map,A++,$.updateMatrices(C),C.castShadow&&q++),r.spotLightMatrix[d]=$.matrix,C.castShadow){const ee=i.get(C);ee.shadowBias=$.bias,ee.shadowNormalBias=$.normalBias,ee.shadowRadius=$.radius,ee.shadowMapSize=$.mapSize,r.spotShadow[d]=ee,r.spotShadowMap[d]=V,R++}d++}else if(C.isRectAreaLight){const H=t.get(C);H.color.copy(F).multiplyScalar(G),H.halfWidth.set(C.width*.5,0,0),H.halfHeight.set(0,C.height*.5,0),r.rectArea[T]=H,T++}else if(C.isPointLight){const H=t.get(C);if(H.color.copy(C.color).multiplyScalar(C.intensity*E),H.distance=C.distance,H.decay=C.decay,C.castShadow){const $=C.shadow,ee=i.get(C);ee.shadowBias=$.bias,ee.shadowNormalBias=$.normalBias,ee.shadowRadius=$.radius,ee.shadowMapSize=$.mapSize,ee.shadowCameraNear=$.camera.near,ee.shadowCameraFar=$.camera.far,r.pointShadow[p]=ee,r.pointShadowMap[p]=V,r.pointShadowMatrix[p]=C.shadow.matrix,P++}r.point[p]=H,p++}else if(C.isHemisphereLight){const H=t.get(C);H.skyColor.copy(C.color).multiplyScalar(G*E),H.groundColor.copy(C.groundColor).multiplyScalar(G*E),r.hemi[x]=H,x++}}T>0&&(e.isWebGL2?n.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=ne.LTC_FLOAT_1,r.rectAreaLTC2=ne.LTC_FLOAT_2):(r.rectAreaLTC1=ne.LTC_HALF_1,r.rectAreaLTC2=ne.LTC_HALF_2):n.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=ne.LTC_FLOAT_1,r.rectAreaLTC2=ne.LTC_FLOAT_2):n.has("OES_texture_half_float_linear")===!0?(r.rectAreaLTC1=ne.LTC_HALF_1,r.rectAreaLTC2=ne.LTC_HALF_2):console.error("THREE.WebGLRenderer: Unable to use RectAreaLight. Missing WebGL extensions.")),r.ambient[0]=f,r.ambient[1]=m,r.ambient[2]=g;const z=r.hash;(z.directionalLength!==v||z.pointLength!==p||z.spotLength!==d||z.rectAreaLength!==T||z.hemiLength!==x||z.numDirectionalShadows!==w||z.numPointShadows!==P||z.numSpotShadows!==R||z.numSpotMaps!==A||z.numLightProbes!==S)&&(r.directional.length=v,r.spot.length=d,r.rectArea.length=T,r.point.length=p,r.hemi.length=x,r.directionalShadow.length=w,r.directionalShadowMap.length=w,r.pointShadow.length=P,r.pointShadowMap.length=P,r.spotShadow.length=R,r.spotShadowMap.length=R,r.directionalShadowMatrix.length=w,r.pointShadowMatrix.length=P,r.spotLightMatrix.length=R+A-q,r.spotLightMap.length=A,r.numSpotLightShadowsWithMaps=q,r.numLightProbes=S,z.directionalLength=v,z.pointLength=p,z.spotLength=d,z.rectAreaLength=T,z.hemiLength=x,z.numDirectionalShadows=w,z.numPointShadows=P,z.numSpotShadows=R,z.numSpotMaps=A,z.numLightProbes=S,r.version=gm++)}function l(u,h){let f=0,m=0,g=0,v=0,p=0;const d=h.matrixWorldInverse;for(let T=0,x=u.length;T<x;T++){const w=u[T];if(w.isDirectionalLight){const P=r.directional[f];P.direction.setFromMatrixPosition(w.matrixWorld),s.setFromMatrixPosition(w.target.matrixWorld),P.direction.sub(s),P.direction.transformDirection(d),f++}else if(w.isSpotLight){const P=r.spot[g];P.position.setFromMatrixPosition(w.matrixWorld),P.position.applyMatrix4(d),P.direction.setFromMatrixPosition(w.matrixWorld),s.setFromMatrixPosition(w.target.matrixWorld),P.direction.sub(s),P.direction.transformDirection(d),g++}else if(w.isRectAreaLight){const P=r.rectArea[v];P.position.setFromMatrixPosition(w.matrixWorld),P.position.applyMatrix4(d),a.identity(),o.copy(w.matrixWorld),o.premultiply(d),a.extractRotation(o),P.halfWidth.set(w.width*.5,0,0),P.halfHeight.set(0,w.height*.5,0),P.halfWidth.applyMatrix4(a),P.halfHeight.applyMatrix4(a),v++}else if(w.isPointLight){const P=r.point[m];P.position.setFromMatrixPosition(w.matrixWorld),P.position.applyMatrix4(d),m++}else if(w.isHemisphereLight){const P=r.hemi[p];P.direction.setFromMatrixPosition(w.matrixWorld),P.direction.transformDirection(d),p++}}}return{setup:c,setupView:l,state:r}}function Oo(n,e){const t=new xm(n,e),i=[],r=[];function s(){i.length=0,r.length=0}function o(h){i.push(h)}function a(h){r.push(h)}function c(h){t.setup(i,h)}function l(h){t.setupView(i,h)}return{init:s,state:{lightsArray:i,shadowsArray:r,lights:t},setupLights:c,setupLightsView:l,pushLight:o,pushShadow:a}}function Mm(n,e){let t=new WeakMap;function i(s,o=0){const a=t.get(s);let c;return a===void 0?(c=new Oo(n,e),t.set(s,[c])):o>=a.length?(c=new Oo(n,e),a.push(c)):c=a[o],c}function r(){t=new WeakMap}return{get:i,dispose:r}}class wc extends Xi{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=gu,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Sm extends Xi{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const ym=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Em=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Tm(n,e,t){let i=new Ys;const r=new $e,s=new $e,o=new vt,a=new wc({depthPacking:rc}),c=new Sm,l={},u=t.maxTextureSize,h={[Ln]:Ut,[Ut]:Ln,[ln]:ln},f=new $n({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new $e},radius:{value:4}},vertexShader:ym,fragmentShader:Em}),m=f.clone();m.defines.HORIZONTAL_PASS=1;const g=new Kn;g.setAttribute("position",new Qt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const v=new dn(g,f),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Yo;let d=this.type;this.render=function(R,A,q){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||R.length===0)return;const S=n.getRenderTarget(),E=n.getActiveCubeFace(),z=n.getActiveMipmapLevel(),Z=n.state;Z.setBlending(fn),Z.buffers.color.setClear(1,1,1,1),Z.buffers.depth.setTest(!0),Z.setScissorTest(!1);const ie=d!==cn&&this.type===cn,C=d===cn&&this.type!==cn;for(let F=0,G=R.length;F<G;F++){const W=R[F],V=W.shadow;if(V===void 0){console.warn("THREE.WebGLShadowMap:",W,"has no shadow.");continue}if(V.autoUpdate===!1&&V.needsUpdate===!1)continue;r.copy(V.mapSize);const H=V.getFrameExtents();if(r.multiply(H),s.copy(V.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/H.x),r.x=s.x*H.x,V.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/H.y),r.y=s.y*H.y,V.mapSize.y=s.y)),V.map===null||ie===!0||C===!0){const ee=this.type!==cn?{minFilter:xt,magFilter:xt}:{};V.map!==null&&V.map.dispose(),V.map=new _n(r.x,r.y,ee),V.map.texture.name=W.name+".shadowMap",V.camera.updateProjectionMatrix()}n.setRenderTarget(V.map),n.clear();const $=V.getViewportCount();for(let ee=0;ee<$;ee++){const ue=V.getViewport(ee);o.set(s.x*ue.x,s.y*ue.y,s.x*ue.z,s.y*ue.w),Z.viewport(o),V.updateMatrices(W,ee),i=V.getFrustum(),w(A,q,V.camera,W,this.type)}V.isPointLightShadow!==!0&&this.type===cn&&T(V,q),V.needsUpdate=!1}d=this.type,p.needsUpdate=!1,n.setRenderTarget(S,E,z)};function T(R,A){const q=e.update(v);f.defines.VSM_SAMPLES!==R.blurSamples&&(f.defines.VSM_SAMPLES=R.blurSamples,m.defines.VSM_SAMPLES=R.blurSamples,f.needsUpdate=!0,m.needsUpdate=!0),R.mapPass===null&&(R.mapPass=new _n(r.x,r.y)),f.uniforms.shadow_pass.value=R.map.texture,f.uniforms.resolution.value=R.mapSize,f.uniforms.radius.value=R.radius,n.setRenderTarget(R.mapPass),n.clear(),n.renderBufferDirect(A,null,q,f,v,null),m.uniforms.shadow_pass.value=R.mapPass.texture,m.uniforms.resolution.value=R.mapSize,m.uniforms.radius.value=R.radius,n.setRenderTarget(R.map),n.clear(),n.renderBufferDirect(A,null,q,m,v,null)}function x(R,A,q,S){let E=null;const z=q.isPointLight===!0?R.customDistanceMaterial:R.customDepthMaterial;if(z!==void 0)E=z;else if(E=q.isPointLight===!0?c:a,n.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0){const Z=E.uuid,ie=A.uuid;let C=l[Z];C===void 0&&(C={},l[Z]=C);let F=C[ie];F===void 0&&(F=E.clone(),C[ie]=F,A.addEventListener("dispose",P)),E=F}if(E.visible=A.visible,E.wireframe=A.wireframe,S===cn?E.side=A.shadowSide!==null?A.shadowSide:A.side:E.side=A.shadowSide!==null?A.shadowSide:h[A.side],E.alphaMap=A.alphaMap,E.alphaTest=A.alphaTest,E.map=A.map,E.clipShadows=A.clipShadows,E.clippingPlanes=A.clippingPlanes,E.clipIntersection=A.clipIntersection,E.displacementMap=A.displacementMap,E.displacementScale=A.displacementScale,E.displacementBias=A.displacementBias,E.wireframeLinewidth=A.wireframeLinewidth,E.linewidth=A.linewidth,q.isPointLight===!0&&E.isMeshDistanceMaterial===!0){const Z=n.properties.get(E);Z.light=q}return E}function w(R,A,q,S,E){if(R.visible===!1)return;if(R.layers.test(A.layers)&&(R.isMesh||R.isLine||R.isPoints)&&(R.castShadow||R.receiveShadow&&E===cn)&&(!R.frustumCulled||i.intersectsObject(R))){R.modelViewMatrix.multiplyMatrices(q.matrixWorldInverse,R.matrixWorld);const ie=e.update(R),C=R.material;if(Array.isArray(C)){const F=ie.groups;for(let G=0,W=F.length;G<W;G++){const V=F[G],H=C[V.materialIndex];if(H&&H.visible){const $=x(R,H,S,E);R.onBeforeShadow(n,R,A,q,ie,$,V),n.renderBufferDirect(q,null,ie,$,R,V),R.onAfterShadow(n,R,A,q,ie,$,V)}}}else if(C.visible){const F=x(R,C,S,E);R.onBeforeShadow(n,R,A,q,ie,F,null),n.renderBufferDirect(q,null,ie,F,R,null),R.onAfterShadow(n,R,A,q,ie,F,null)}}const Z=R.children;for(let ie=0,C=Z.length;ie<C;ie++)w(Z[ie],A,q,S,E)}function P(R){R.target.removeEventListener("dispose",P);for(const q in l){const S=l[q],E=R.target.uuid;E in S&&(S[E].dispose(),delete S[E])}}}function bm(n,e,t){const i=t.isWebGL2;function r(){let b=!1;const re=new vt;let se=null;const Ae=new vt(0,0,0,0);return{setMask:function(ye){se!==ye&&!b&&(n.colorMask(ye,ye,ye,ye),se=ye)},setLocked:function(ye){b=ye},setClear:function(ye,et,tt,mt,At){At===!0&&(ye*=mt,et*=mt,tt*=mt),re.set(ye,et,tt,mt),Ae.equals(re)===!1&&(n.clearColor(ye,et,tt,mt),Ae.copy(re))},reset:function(){b=!1,se=null,Ae.set(-1,0,0,0)}}}function s(){let b=!1,re=null,se=null,Ae=null;return{setTest:function(ye){ye?Ne(n.DEPTH_TEST):be(n.DEPTH_TEST)},setMask:function(ye){re!==ye&&!b&&(n.depthMask(ye),re=ye)},setFunc:function(ye){if(se!==ye){switch(ye){case Yl:n.depthFunc(n.NEVER);break;case Zl:n.depthFunc(n.ALWAYS);break;case jl:n.depthFunc(n.LESS);break;case wr:n.depthFunc(n.LEQUAL);break;case $l:n.depthFunc(n.EQUAL);break;case Kl:n.depthFunc(n.GEQUAL);break;case Jl:n.depthFunc(n.GREATER);break;case Ql:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}se=ye}},setLocked:function(ye){b=ye},setClear:function(ye){Ae!==ye&&(n.clearDepth(ye),Ae=ye)},reset:function(){b=!1,re=null,se=null,Ae=null}}}function o(){let b=!1,re=null,se=null,Ae=null,ye=null,et=null,tt=null,mt=null,At=null;return{setTest:function(nt){b||(nt?Ne(n.STENCIL_TEST):be(n.STENCIL_TEST))},setMask:function(nt){re!==nt&&!b&&(n.stencilMask(nt),re=nt)},setFunc:function(nt,wt,jt){(se!==nt||Ae!==wt||ye!==jt)&&(n.stencilFunc(nt,wt,jt),se=nt,Ae=wt,ye=jt)},setOp:function(nt,wt,jt){(et!==nt||tt!==wt||mt!==jt)&&(n.stencilOp(nt,wt,jt),et=nt,tt=wt,mt=jt)},setLocked:function(nt){b=nt},setClear:function(nt){At!==nt&&(n.clearStencil(nt),At=nt)},reset:function(){b=!1,re=null,se=null,Ae=null,ye=null,et=null,tt=null,mt=null,At=null}}}const a=new r,c=new s,l=new o,u=new WeakMap,h=new WeakMap;let f={},m={},g=new WeakMap,v=[],p=null,d=!1,T=null,x=null,w=null,P=null,R=null,A=null,q=null,S=new je(0,0,0),E=0,z=!1,Z=null,ie=null,C=null,F=null,G=null;const W=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let V=!1,H=0;const $=n.getParameter(n.VERSION);$.indexOf("WebGL")!==-1?(H=parseFloat(/^WebGL (\d)/.exec($)[1]),V=H>=1):$.indexOf("OpenGL ES")!==-1&&(H=parseFloat(/^OpenGL ES (\d)/.exec($)[1]),V=H>=2);let ee=null,ue={};const k=n.getParameter(n.SCISSOR_BOX),X=n.getParameter(n.VIEWPORT),ce=new vt().fromArray(k),xe=new vt().fromArray(X);function ve(b,re,se,Ae){const ye=new Uint8Array(4),et=n.createTexture();n.bindTexture(b,et),n.texParameteri(b,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(b,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let tt=0;tt<se;tt++)i&&(b===n.TEXTURE_3D||b===n.TEXTURE_2D_ARRAY)?n.texImage3D(re,0,n.RGBA,1,1,Ae,0,n.RGBA,n.UNSIGNED_BYTE,ye):n.texImage2D(re+tt,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,ye);return et}const Ue={};Ue[n.TEXTURE_2D]=ve(n.TEXTURE_2D,n.TEXTURE_2D,1),Ue[n.TEXTURE_CUBE_MAP]=ve(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),i&&(Ue[n.TEXTURE_2D_ARRAY]=ve(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),Ue[n.TEXTURE_3D]=ve(n.TEXTURE_3D,n.TEXTURE_3D,1,1)),a.setClear(0,0,0,1),c.setClear(1),l.setClear(0),Ne(n.DEPTH_TEST),c.setFunc(wr),Be(!1),y(_a),Ne(n.CULL_FACE),me(fn);function Ne(b){f[b]!==!0&&(n.enable(b),f[b]=!0)}function be(b){f[b]!==!1&&(n.disable(b),f[b]=!1)}function Ye(b,re){return m[b]!==re?(n.bindFramebuffer(b,re),m[b]=re,i&&(b===n.DRAW_FRAMEBUFFER&&(m[n.FRAMEBUFFER]=re),b===n.FRAMEBUFFER&&(m[n.DRAW_FRAMEBUFFER]=re)),!0):!1}function D(b,re){let se=v,Ae=!1;if(b)if(se=g.get(re),se===void 0&&(se=[],g.set(re,se)),b.isWebGLMultipleRenderTargets){const ye=b.texture;if(se.length!==ye.length||se[0]!==n.COLOR_ATTACHMENT0){for(let et=0,tt=ye.length;et<tt;et++)se[et]=n.COLOR_ATTACHMENT0+et;se.length=ye.length,Ae=!0}}else se[0]!==n.COLOR_ATTACHMENT0&&(se[0]=n.COLOR_ATTACHMENT0,Ae=!0);else se[0]!==n.BACK&&(se[0]=n.BACK,Ae=!0);Ae&&(t.isWebGL2?n.drawBuffers(se):e.get("WEBGL_draw_buffers").drawBuffersWEBGL(se))}function bt(b){return p!==b?(n.useProgram(b),p=b,!0):!1}const Se={[kn]:n.FUNC_ADD,[Dl]:n.FUNC_SUBTRACT,[Ul]:n.FUNC_REVERSE_SUBTRACT};if(i)Se[Ma]=n.MIN,Se[Sa]=n.MAX;else{const b=e.get("EXT_blend_minmax");b!==null&&(Se[Ma]=b.MIN_EXT,Se[Sa]=b.MAX_EXT)}const Pe={[Il]:n.ZERO,[Nl]:n.ONE,[Ol]:n.SRC_COLOR,[Ls]:n.SRC_ALPHA,[Hl]:n.SRC_ALPHA_SATURATE,[kl]:n.DST_COLOR,[Bl]:n.DST_ALPHA,[Fl]:n.ONE_MINUS_SRC_COLOR,[Ps]:n.ONE_MINUS_SRC_ALPHA,[Gl]:n.ONE_MINUS_DST_COLOR,[zl]:n.ONE_MINUS_DST_ALPHA,[Vl]:n.CONSTANT_COLOR,[Wl]:n.ONE_MINUS_CONSTANT_COLOR,[Xl]:n.CONSTANT_ALPHA,[ql]:n.ONE_MINUS_CONSTANT_ALPHA};function me(b,re,se,Ae,ye,et,tt,mt,At,nt){if(b===fn){d===!0&&(be(n.BLEND),d=!1);return}if(d===!1&&(Ne(n.BLEND),d=!0),b!==Pl){if(b!==T||nt!==z){if((x!==kn||R!==kn)&&(n.blendEquation(n.FUNC_ADD),x=kn,R=kn),nt)switch(b){case gi:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case ga:n.blendFunc(n.ONE,n.ONE);break;case va:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case xa:n.blendFuncSeparate(n.ZERO,n.SRC_COLOR,n.ZERO,n.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",b);break}else switch(b){case gi:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case ga:n.blendFunc(n.SRC_ALPHA,n.ONE);break;case va:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case xa:n.blendFunc(n.ZERO,n.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",b);break}w=null,P=null,A=null,q=null,S.set(0,0,0),E=0,T=b,z=nt}return}ye=ye||re,et=et||se,tt=tt||Ae,(re!==x||ye!==R)&&(n.blendEquationSeparate(Se[re],Se[ye]),x=re,R=ye),(se!==w||Ae!==P||et!==A||tt!==q)&&(n.blendFuncSeparate(Pe[se],Pe[Ae],Pe[et],Pe[tt]),w=se,P=Ae,A=et,q=tt),(mt.equals(S)===!1||At!==E)&&(n.blendColor(mt.r,mt.g,mt.b,At),S.copy(mt),E=At),T=b,z=!1}function st(b,re){b.side===ln?be(n.CULL_FACE):Ne(n.CULL_FACE);let se=b.side===Ut;re&&(se=!se),Be(se),b.blending===gi&&b.transparent===!1?me(fn):me(b.blending,b.blendEquation,b.blendSrc,b.blendDst,b.blendEquationAlpha,b.blendSrcAlpha,b.blendDstAlpha,b.blendColor,b.blendAlpha,b.premultipliedAlpha),c.setFunc(b.depthFunc),c.setTest(b.depthTest),c.setMask(b.depthWrite),a.setMask(b.colorWrite);const Ae=b.stencilWrite;l.setTest(Ae),Ae&&(l.setMask(b.stencilWriteMask),l.setFunc(b.stencilFunc,b.stencilRef,b.stencilFuncMask),l.setOp(b.stencilFail,b.stencilZFail,b.stencilZPass)),I(b.polygonOffset,b.polygonOffsetFactor,b.polygonOffsetUnits),b.alphaToCoverage===!0?Ne(n.SAMPLE_ALPHA_TO_COVERAGE):be(n.SAMPLE_ALPHA_TO_COVERAGE)}function Be(b){Z!==b&&(b?n.frontFace(n.CW):n.frontFace(n.CCW),Z=b)}function y(b){b!==Rl?(Ne(n.CULL_FACE),b!==ie&&(b===_a?n.cullFace(n.BACK):b===Cl?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):be(n.CULL_FACE),ie=b}function _(b){b!==C&&(V&&n.lineWidth(b),C=b)}function I(b,re,se){b?(Ne(n.POLYGON_OFFSET_FILL),(F!==re||G!==se)&&(n.polygonOffset(re,se),F=re,G=se)):be(n.POLYGON_OFFSET_FILL)}function K(b){b?Ne(n.SCISSOR_TEST):be(n.SCISSOR_TEST)}function j(b){b===void 0&&(b=n.TEXTURE0+W-1),ee!==b&&(n.activeTexture(b),ee=b)}function Q(b,re,se){se===void 0&&(ee===null?se=n.TEXTURE0+W-1:se=ee);let Ae=ue[se];Ae===void 0&&(Ae={type:void 0,texture:void 0},ue[se]=Ae),(Ae.type!==b||Ae.texture!==re)&&(ee!==se&&(n.activeTexture(se),ee=se),n.bindTexture(b,re||Ue[b]),Ae.type=b,Ae.texture=re)}function _e(){const b=ue[ee];b!==void 0&&b.type!==void 0&&(n.bindTexture(b.type,null),b.type=void 0,b.texture=void 0)}function oe(){try{n.compressedTexImage2D.apply(n,arguments)}catch(b){console.error("THREE.WebGLState:",b)}}function he(){try{n.compressedTexImage3D.apply(n,arguments)}catch(b){console.error("THREE.WebGLState:",b)}}function Te(){try{n.texSubImage2D.apply(n,arguments)}catch(b){console.error("THREE.WebGLState:",b)}}function ze(){try{n.texSubImage3D.apply(n,arguments)}catch(b){console.error("THREE.WebGLState:",b)}}function Y(){try{n.compressedTexSubImage2D.apply(n,arguments)}catch(b){console.error("THREE.WebGLState:",b)}}function Je(){try{n.compressedTexSubImage3D.apply(n,arguments)}catch(b){console.error("THREE.WebGLState:",b)}}function Xe(){try{n.texStorage2D.apply(n,arguments)}catch(b){console.error("THREE.WebGLState:",b)}}function Le(){try{n.texStorage3D.apply(n,arguments)}catch(b){console.error("THREE.WebGLState:",b)}}function Me(){try{n.texImage2D.apply(n,arguments)}catch(b){console.error("THREE.WebGLState:",b)}}function fe(){try{n.texImage3D.apply(n,arguments)}catch(b){console.error("THREE.WebGLState:",b)}}function Oe(b){ce.equals(b)===!1&&(n.scissor(b.x,b.y,b.z,b.w),ce.copy(b))}function Ke(b){xe.equals(b)===!1&&(n.viewport(b.x,b.y,b.z,b.w),xe.copy(b))}function ot(b,re){let se=h.get(re);se===void 0&&(se=new WeakMap,h.set(re,se));let Ae=se.get(b);Ae===void 0&&(Ae=n.getUniformBlockIndex(re,b.name),se.set(b,Ae))}function He(b,re){const Ae=h.get(re).get(b);u.get(re)!==Ae&&(n.uniformBlockBinding(re,Ae,b.__bindingPointIndex),u.set(re,Ae))}function te(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),i===!0&&(n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null)),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),f={},ee=null,ue={},m={},g=new WeakMap,v=[],p=null,d=!1,T=null,x=null,w=null,P=null,R=null,A=null,q=null,S=new je(0,0,0),E=0,z=!1,Z=null,ie=null,C=null,F=null,G=null,ce.set(0,0,n.canvas.width,n.canvas.height),xe.set(0,0,n.canvas.width,n.canvas.height),a.reset(),c.reset(),l.reset()}return{buffers:{color:a,depth:c,stencil:l},enable:Ne,disable:be,bindFramebuffer:Ye,drawBuffers:D,useProgram:bt,setBlending:me,setMaterial:st,setFlipSided:Be,setCullFace:y,setLineWidth:_,setPolygonOffset:I,setScissorTest:K,activeTexture:j,bindTexture:Q,unbindTexture:_e,compressedTexImage2D:oe,compressedTexImage3D:he,texImage2D:Me,texImage3D:fe,updateUBOMapping:ot,uniformBlockBinding:He,texStorage2D:Xe,texStorage3D:Le,texSubImage2D:Te,texSubImage3D:ze,compressedTexSubImage2D:Y,compressedTexSubImage3D:Je,scissor:Oe,viewport:Ke,reset:te}}function Am(n,e,t,i,r,s,o){const a=r.isWebGL2,c=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),u=new WeakMap;let h;const f=new WeakMap;let m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(y,_){return m?new OffscreenCanvas(y,_):Dr("canvas")}function v(y,_,I,K){let j=1;if((y.width>K||y.height>K)&&(j=K/Math.max(y.width,y.height)),j<1||_===!0)if(typeof HTMLImageElement<"u"&&y instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&y instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&y instanceof ImageBitmap){const Q=_?Bs:Math.floor,_e=Q(j*y.width),oe=Q(j*y.height);h===void 0&&(h=g(_e,oe));const he=I?g(_e,oe):h;return he.width=_e,he.height=oe,he.getContext("2d").drawImage(y,0,0,_e,oe),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+y.width+"x"+y.height+") to ("+_e+"x"+oe+")."),he}else return"data"in y&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+y.width+"x"+y.height+")."),y;return y}function p(y){return Ka(y.width)&&Ka(y.height)}function d(y){return a?!1:y.wrapS!==Zt||y.wrapT!==Zt||y.minFilter!==xt&&y.minFilter!==Lt}function T(y,_){return y.generateMipmaps&&_&&y.minFilter!==xt&&y.minFilter!==Lt}function x(y){n.generateMipmap(y)}function w(y,_,I,K,j=!1){if(a===!1)return _;if(y!==null){if(n[y]!==void 0)return n[y];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+y+"'")}let Q=_;if(_===n.RED&&(I===n.FLOAT&&(Q=n.R32F),I===n.HALF_FLOAT&&(Q=n.R16F),I===n.UNSIGNED_BYTE&&(Q=n.R8)),_===n.RED_INTEGER&&(I===n.UNSIGNED_BYTE&&(Q=n.R8UI),I===n.UNSIGNED_SHORT&&(Q=n.R16UI),I===n.UNSIGNED_INT&&(Q=n.R32UI),I===n.BYTE&&(Q=n.R8I),I===n.SHORT&&(Q=n.R16I),I===n.INT&&(Q=n.R32I)),_===n.RG&&(I===n.FLOAT&&(Q=n.RG32F),I===n.HALF_FLOAT&&(Q=n.RG16F),I===n.UNSIGNED_BYTE&&(Q=n.RG8)),_===n.RGBA){const _e=j?Rr:Qe.getTransfer(K);I===n.FLOAT&&(Q=n.RGBA32F),I===n.HALF_FLOAT&&(Q=n.RGBA16F),I===n.UNSIGNED_BYTE&&(Q=_e===it?n.SRGB8_ALPHA8:n.RGBA8),I===n.UNSIGNED_SHORT_4_4_4_4&&(Q=n.RGBA4),I===n.UNSIGNED_SHORT_5_5_5_1&&(Q=n.RGB5_A1)}return(Q===n.R16F||Q===n.R32F||Q===n.RG16F||Q===n.RG32F||Q===n.RGBA16F||Q===n.RGBA32F)&&e.get("EXT_color_buffer_float"),Q}function P(y,_,I){return T(y,I)===!0||y.isFramebufferTexture&&y.minFilter!==xt&&y.minFilter!==Lt?Math.log2(Math.max(_.width,_.height))+1:y.mipmaps!==void 0&&y.mipmaps.length>0?y.mipmaps.length:y.isCompressedTexture&&Array.isArray(y.image)?_.mipmaps.length:1}function R(y){return y===xt||y===ya||y===Xr?n.NEAREST:n.LINEAR}function A(y){const _=y.target;_.removeEventListener("dispose",A),S(_),_.isVideoTexture&&u.delete(_)}function q(y){const _=y.target;_.removeEventListener("dispose",q),z(_)}function S(y){const _=i.get(y);if(_.__webglInit===void 0)return;const I=y.source,K=f.get(I);if(K){const j=K[_.__cacheKey];j.usedTimes--,j.usedTimes===0&&E(y),Object.keys(K).length===0&&f.delete(I)}i.remove(y)}function E(y){const _=i.get(y);n.deleteTexture(_.__webglTexture);const I=y.source,K=f.get(I);delete K[_.__cacheKey],o.memory.textures--}function z(y){const _=y.texture,I=i.get(y),K=i.get(_);if(K.__webglTexture!==void 0&&(n.deleteTexture(K.__webglTexture),o.memory.textures--),y.depthTexture&&y.depthTexture.dispose(),y.isWebGLCubeRenderTarget)for(let j=0;j<6;j++){if(Array.isArray(I.__webglFramebuffer[j]))for(let Q=0;Q<I.__webglFramebuffer[j].length;Q++)n.deleteFramebuffer(I.__webglFramebuffer[j][Q]);else n.deleteFramebuffer(I.__webglFramebuffer[j]);I.__webglDepthbuffer&&n.deleteRenderbuffer(I.__webglDepthbuffer[j])}else{if(Array.isArray(I.__webglFramebuffer))for(let j=0;j<I.__webglFramebuffer.length;j++)n.deleteFramebuffer(I.__webglFramebuffer[j]);else n.deleteFramebuffer(I.__webglFramebuffer);if(I.__webglDepthbuffer&&n.deleteRenderbuffer(I.__webglDepthbuffer),I.__webglMultisampledFramebuffer&&n.deleteFramebuffer(I.__webglMultisampledFramebuffer),I.__webglColorRenderbuffer)for(let j=0;j<I.__webglColorRenderbuffer.length;j++)I.__webglColorRenderbuffer[j]&&n.deleteRenderbuffer(I.__webglColorRenderbuffer[j]);I.__webglDepthRenderbuffer&&n.deleteRenderbuffer(I.__webglDepthRenderbuffer)}if(y.isWebGLMultipleRenderTargets)for(let j=0,Q=_.length;j<Q;j++){const _e=i.get(_[j]);_e.__webglTexture&&(n.deleteTexture(_e.__webglTexture),o.memory.textures--),i.remove(_[j])}i.remove(_),i.remove(y)}let Z=0;function ie(){Z=0}function C(){const y=Z;return y>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+y+" texture units while this GPU supports only "+r.maxTextures),Z+=1,y}function F(y){const _=[];return _.push(y.wrapS),_.push(y.wrapT),_.push(y.wrapR||0),_.push(y.magFilter),_.push(y.minFilter),_.push(y.anisotropy),_.push(y.internalFormat),_.push(y.format),_.push(y.type),_.push(y.generateMipmaps),_.push(y.premultiplyAlpha),_.push(y.flipY),_.push(y.unpackAlignment),_.push(y.colorSpace),_.join()}function G(y,_){const I=i.get(y);if(y.isVideoTexture&&st(y),y.isRenderTargetTexture===!1&&y.version>0&&I.__version!==y.version){const K=y.image;if(K===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(K.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{ce(I,y,_);return}}t.bindTexture(n.TEXTURE_2D,I.__webglTexture,n.TEXTURE0+_)}function W(y,_){const I=i.get(y);if(y.version>0&&I.__version!==y.version){ce(I,y,_);return}t.bindTexture(n.TEXTURE_2D_ARRAY,I.__webglTexture,n.TEXTURE0+_)}function V(y,_){const I=i.get(y);if(y.version>0&&I.__version!==y.version){ce(I,y,_);return}t.bindTexture(n.TEXTURE_3D,I.__webglTexture,n.TEXTURE0+_)}function H(y,_){const I=i.get(y);if(y.version>0&&I.__version!==y.version){xe(I,y,_);return}t.bindTexture(n.TEXTURE_CUBE_MAP,I.__webglTexture,n.TEXTURE0+_)}const $={[Is]:n.REPEAT,[Zt]:n.CLAMP_TO_EDGE,[Ns]:n.MIRRORED_REPEAT},ee={[xt]:n.NEAREST,[ya]:n.NEAREST_MIPMAP_NEAREST,[Xr]:n.NEAREST_MIPMAP_LINEAR,[Lt]:n.LINEAR,[cu]:n.LINEAR_MIPMAP_NEAREST,[ki]:n.LINEAR_MIPMAP_LINEAR},ue={[xu]:n.NEVER,[bu]:n.ALWAYS,[Mu]:n.LESS,[ac]:n.LEQUAL,[Su]:n.EQUAL,[Tu]:n.GEQUAL,[yu]:n.GREATER,[Eu]:n.NOTEQUAL};function k(y,_,I){if(I?(n.texParameteri(y,n.TEXTURE_WRAP_S,$[_.wrapS]),n.texParameteri(y,n.TEXTURE_WRAP_T,$[_.wrapT]),(y===n.TEXTURE_3D||y===n.TEXTURE_2D_ARRAY)&&n.texParameteri(y,n.TEXTURE_WRAP_R,$[_.wrapR]),n.texParameteri(y,n.TEXTURE_MAG_FILTER,ee[_.magFilter]),n.texParameteri(y,n.TEXTURE_MIN_FILTER,ee[_.minFilter])):(n.texParameteri(y,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(y,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),(y===n.TEXTURE_3D||y===n.TEXTURE_2D_ARRAY)&&n.texParameteri(y,n.TEXTURE_WRAP_R,n.CLAMP_TO_EDGE),(_.wrapS!==Zt||_.wrapT!==Zt)&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping."),n.texParameteri(y,n.TEXTURE_MAG_FILTER,R(_.magFilter)),n.texParameteri(y,n.TEXTURE_MIN_FILTER,R(_.minFilter)),_.minFilter!==xt&&_.minFilter!==Lt&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.")),_.compareFunction&&(n.texParameteri(y,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(y,n.TEXTURE_COMPARE_FUNC,ue[_.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){const K=e.get("EXT_texture_filter_anisotropic");if(_.magFilter===xt||_.minFilter!==Xr&&_.minFilter!==ki||_.type===An&&e.has("OES_texture_float_linear")===!1||a===!1&&_.type===Gi&&e.has("OES_texture_half_float_linear")===!1)return;(_.anisotropy>1||i.get(_).__currentAnisotropy)&&(n.texParameterf(y,K.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,r.getMaxAnisotropy())),i.get(_).__currentAnisotropy=_.anisotropy)}}function X(y,_){let I=!1;y.__webglInit===void 0&&(y.__webglInit=!0,_.addEventListener("dispose",A));const K=_.source;let j=f.get(K);j===void 0&&(j={},f.set(K,j));const Q=F(_);if(Q!==y.__cacheKey){j[Q]===void 0&&(j[Q]={texture:n.createTexture(),usedTimes:0},o.memory.textures++,I=!0),j[Q].usedTimes++;const _e=j[y.__cacheKey];_e!==void 0&&(j[y.__cacheKey].usedTimes--,_e.usedTimes===0&&E(_)),y.__cacheKey=Q,y.__webglTexture=j[Q].texture}return I}function ce(y,_,I){let K=n.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&(K=n.TEXTURE_2D_ARRAY),_.isData3DTexture&&(K=n.TEXTURE_3D);const j=X(y,_),Q=_.source;t.bindTexture(K,y.__webglTexture,n.TEXTURE0+I);const _e=i.get(Q);if(Q.version!==_e.__version||j===!0){t.activeTexture(n.TEXTURE0+I);const oe=Qe.getPrimaries(Qe.workingColorSpace),he=_.colorSpace===Ht?null:Qe.getPrimaries(_.colorSpace),Te=_.colorSpace===Ht||oe===he?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,_.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,_.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Te);const ze=d(_)&&p(_.image)===!1;let Y=v(_.image,ze,!1,r.maxTextureSize);Y=Be(_,Y);const Je=p(Y)||a,Xe=s.convert(_.format,_.colorSpace);let Le=s.convert(_.type),Me=w(_.internalFormat,Xe,Le,_.colorSpace,_.isVideoTexture);k(K,_,Je);let fe;const Oe=_.mipmaps,Ke=a&&_.isVideoTexture!==!0&&Me!==nc,ot=_e.__version===void 0||j===!0,He=P(_,Y,Je);if(_.isDepthTexture)Me=n.DEPTH_COMPONENT,a?_.type===An?Me=n.DEPTH_COMPONENT32F:_.type===bn?Me=n.DEPTH_COMPONENT24:_.type===Hn?Me=n.DEPTH24_STENCIL8:Me=n.DEPTH_COMPONENT16:_.type===An&&console.error("WebGLRenderer: Floating point depth texture requires WebGL2."),_.format===Vn&&Me===n.DEPTH_COMPONENT&&_.type!==Ws&&_.type!==bn&&(console.warn("THREE.WebGLRenderer: Use UnsignedShortType or UnsignedIntType for DepthFormat DepthTexture."),_.type=bn,Le=s.convert(_.type)),_.format===Ti&&Me===n.DEPTH_COMPONENT&&(Me=n.DEPTH_STENCIL,_.type!==Hn&&(console.warn("THREE.WebGLRenderer: Use UnsignedInt248Type for DepthStencilFormat DepthTexture."),_.type=Hn,Le=s.convert(_.type))),ot&&(Ke?t.texStorage2D(n.TEXTURE_2D,1,Me,Y.width,Y.height):t.texImage2D(n.TEXTURE_2D,0,Me,Y.width,Y.height,0,Xe,Le,null));else if(_.isDataTexture)if(Oe.length>0&&Je){Ke&&ot&&t.texStorage2D(n.TEXTURE_2D,He,Me,Oe[0].width,Oe[0].height);for(let te=0,b=Oe.length;te<b;te++)fe=Oe[te],Ke?t.texSubImage2D(n.TEXTURE_2D,te,0,0,fe.width,fe.height,Xe,Le,fe.data):t.texImage2D(n.TEXTURE_2D,te,Me,fe.width,fe.height,0,Xe,Le,fe.data);_.generateMipmaps=!1}else Ke?(ot&&t.texStorage2D(n.TEXTURE_2D,He,Me,Y.width,Y.height),t.texSubImage2D(n.TEXTURE_2D,0,0,0,Y.width,Y.height,Xe,Le,Y.data)):t.texImage2D(n.TEXTURE_2D,0,Me,Y.width,Y.height,0,Xe,Le,Y.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){Ke&&ot&&t.texStorage3D(n.TEXTURE_2D_ARRAY,He,Me,Oe[0].width,Oe[0].height,Y.depth);for(let te=0,b=Oe.length;te<b;te++)fe=Oe[te],_.format!==Ft?Xe!==null?Ke?t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,te,0,0,0,fe.width,fe.height,Y.depth,Xe,fe.data,0,0):t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,te,Me,fe.width,fe.height,Y.depth,0,fe.data,0,0):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Ke?t.texSubImage3D(n.TEXTURE_2D_ARRAY,te,0,0,0,fe.width,fe.height,Y.depth,Xe,Le,fe.data):t.texImage3D(n.TEXTURE_2D_ARRAY,te,Me,fe.width,fe.height,Y.depth,0,Xe,Le,fe.data)}else{Ke&&ot&&t.texStorage2D(n.TEXTURE_2D,He,Me,Oe[0].width,Oe[0].height);for(let te=0,b=Oe.length;te<b;te++)fe=Oe[te],_.format!==Ft?Xe!==null?Ke?t.compressedTexSubImage2D(n.TEXTURE_2D,te,0,0,fe.width,fe.height,Xe,fe.data):t.compressedTexImage2D(n.TEXTURE_2D,te,Me,fe.width,fe.height,0,fe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Ke?t.texSubImage2D(n.TEXTURE_2D,te,0,0,fe.width,fe.height,Xe,Le,fe.data):t.texImage2D(n.TEXTURE_2D,te,Me,fe.width,fe.height,0,Xe,Le,fe.data)}else if(_.isDataArrayTexture)Ke?(ot&&t.texStorage3D(n.TEXTURE_2D_ARRAY,He,Me,Y.width,Y.height,Y.depth),t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,Y.width,Y.height,Y.depth,Xe,Le,Y.data)):t.texImage3D(n.TEXTURE_2D_ARRAY,0,Me,Y.width,Y.height,Y.depth,0,Xe,Le,Y.data);else if(_.isData3DTexture)Ke?(ot&&t.texStorage3D(n.TEXTURE_3D,He,Me,Y.width,Y.height,Y.depth),t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,Y.width,Y.height,Y.depth,Xe,Le,Y.data)):t.texImage3D(n.TEXTURE_3D,0,Me,Y.width,Y.height,Y.depth,0,Xe,Le,Y.data);else if(_.isFramebufferTexture){if(ot)if(Ke)t.texStorage2D(n.TEXTURE_2D,He,Me,Y.width,Y.height);else{let te=Y.width,b=Y.height;for(let re=0;re<He;re++)t.texImage2D(n.TEXTURE_2D,re,Me,te,b,0,Xe,Le,null),te>>=1,b>>=1}}else if(Oe.length>0&&Je){Ke&&ot&&t.texStorage2D(n.TEXTURE_2D,He,Me,Oe[0].width,Oe[0].height);for(let te=0,b=Oe.length;te<b;te++)fe=Oe[te],Ke?t.texSubImage2D(n.TEXTURE_2D,te,0,0,Xe,Le,fe):t.texImage2D(n.TEXTURE_2D,te,Me,Xe,Le,fe);_.generateMipmaps=!1}else Ke?(ot&&t.texStorage2D(n.TEXTURE_2D,He,Me,Y.width,Y.height),t.texSubImage2D(n.TEXTURE_2D,0,0,0,Xe,Le,Y)):t.texImage2D(n.TEXTURE_2D,0,Me,Xe,Le,Y);T(_,Je)&&x(K),_e.__version=Q.version,_.onUpdate&&_.onUpdate(_)}y.__version=_.version}function xe(y,_,I){if(_.image.length!==6)return;const K=X(y,_),j=_.source;t.bindTexture(n.TEXTURE_CUBE_MAP,y.__webglTexture,n.TEXTURE0+I);const Q=i.get(j);if(j.version!==Q.__version||K===!0){t.activeTexture(n.TEXTURE0+I);const _e=Qe.getPrimaries(Qe.workingColorSpace),oe=_.colorSpace===Ht?null:Qe.getPrimaries(_.colorSpace),he=_.colorSpace===Ht||_e===oe?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,_.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,_.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,he);const Te=_.isCompressedTexture||_.image[0].isCompressedTexture,ze=_.image[0]&&_.image[0].isDataTexture,Y=[];for(let te=0;te<6;te++)!Te&&!ze?Y[te]=v(_.image[te],!1,!0,r.maxCubemapSize):Y[te]=ze?_.image[te].image:_.image[te],Y[te]=Be(_,Y[te]);const Je=Y[0],Xe=p(Je)||a,Le=s.convert(_.format,_.colorSpace),Me=s.convert(_.type),fe=w(_.internalFormat,Le,Me,_.colorSpace),Oe=a&&_.isVideoTexture!==!0,Ke=Q.__version===void 0||K===!0;let ot=P(_,Je,Xe);k(n.TEXTURE_CUBE_MAP,_,Xe);let He;if(Te){Oe&&Ke&&t.texStorage2D(n.TEXTURE_CUBE_MAP,ot,fe,Je.width,Je.height);for(let te=0;te<6;te++){He=Y[te].mipmaps;for(let b=0;b<He.length;b++){const re=He[b];_.format!==Ft?Le!==null?Oe?t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,b,0,0,re.width,re.height,Le,re.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,b,fe,re.width,re.height,0,re.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Oe?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,b,0,0,re.width,re.height,Le,Me,re.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,b,fe,re.width,re.height,0,Le,Me,re.data)}}}else{He=_.mipmaps,Oe&&Ke&&(He.length>0&&ot++,t.texStorage2D(n.TEXTURE_CUBE_MAP,ot,fe,Y[0].width,Y[0].height));for(let te=0;te<6;te++)if(ze){Oe?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,0,0,Y[te].width,Y[te].height,Le,Me,Y[te].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,fe,Y[te].width,Y[te].height,0,Le,Me,Y[te].data);for(let b=0;b<He.length;b++){const se=He[b].image[te].image;Oe?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,b+1,0,0,se.width,se.height,Le,Me,se.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,b+1,fe,se.width,se.height,0,Le,Me,se.data)}}else{Oe?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,0,0,Le,Me,Y[te]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,fe,Le,Me,Y[te]);for(let b=0;b<He.length;b++){const re=He[b];Oe?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,b+1,0,0,Le,Me,re.image[te]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+te,b+1,fe,Le,Me,re.image[te])}}}T(_,Xe)&&x(n.TEXTURE_CUBE_MAP),Q.__version=j.version,_.onUpdate&&_.onUpdate(_)}y.__version=_.version}function ve(y,_,I,K,j,Q){const _e=s.convert(I.format,I.colorSpace),oe=s.convert(I.type),he=w(I.internalFormat,_e,oe,I.colorSpace);if(!i.get(_).__hasExternalTextures){const ze=Math.max(1,_.width>>Q),Y=Math.max(1,_.height>>Q);j===n.TEXTURE_3D||j===n.TEXTURE_2D_ARRAY?t.texImage3D(j,Q,he,ze,Y,_.depth,0,_e,oe,null):t.texImage2D(j,Q,he,ze,Y,0,_e,oe,null)}t.bindFramebuffer(n.FRAMEBUFFER,y),me(_)?c.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,K,j,i.get(I).__webglTexture,0,Pe(_)):(j===n.TEXTURE_2D||j>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&j<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,K,j,i.get(I).__webglTexture,Q),t.bindFramebuffer(n.FRAMEBUFFER,null)}function Ue(y,_,I){if(n.bindRenderbuffer(n.RENDERBUFFER,y),_.depthBuffer&&!_.stencilBuffer){let K=a===!0?n.DEPTH_COMPONENT24:n.DEPTH_COMPONENT16;if(I||me(_)){const j=_.depthTexture;j&&j.isDepthTexture&&(j.type===An?K=n.DEPTH_COMPONENT32F:j.type===bn&&(K=n.DEPTH_COMPONENT24));const Q=Pe(_);me(_)?c.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Q,K,_.width,_.height):n.renderbufferStorageMultisample(n.RENDERBUFFER,Q,K,_.width,_.height)}else n.renderbufferStorage(n.RENDERBUFFER,K,_.width,_.height);n.framebufferRenderbuffer(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.RENDERBUFFER,y)}else if(_.depthBuffer&&_.stencilBuffer){const K=Pe(_);I&&me(_)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,K,n.DEPTH24_STENCIL8,_.width,_.height):me(_)?c.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,K,n.DEPTH24_STENCIL8,_.width,_.height):n.renderbufferStorage(n.RENDERBUFFER,n.DEPTH_STENCIL,_.width,_.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.RENDERBUFFER,y)}else{const K=_.isWebGLMultipleRenderTargets===!0?_.texture:[_.texture];for(let j=0;j<K.length;j++){const Q=K[j],_e=s.convert(Q.format,Q.colorSpace),oe=s.convert(Q.type),he=w(Q.internalFormat,_e,oe,Q.colorSpace),Te=Pe(_);I&&me(_)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,Te,he,_.width,_.height):me(_)?c.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Te,he,_.width,_.height):n.renderbufferStorage(n.RENDERBUFFER,he,_.width,_.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function Ne(y,_){if(_&&_.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(n.FRAMEBUFFER,y),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!i.get(_.depthTexture).__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),G(_.depthTexture,0);const K=i.get(_.depthTexture).__webglTexture,j=Pe(_);if(_.depthTexture.format===Vn)me(_)?c.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,K,0,j):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,K,0);else if(_.depthTexture.format===Ti)me(_)?c.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,K,0,j):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,K,0);else throw new Error("Unknown depthTexture format")}function be(y){const _=i.get(y),I=y.isWebGLCubeRenderTarget===!0;if(y.depthTexture&&!_.__autoAllocateDepthBuffer){if(I)throw new Error("target.depthTexture not supported in Cube render targets");Ne(_.__webglFramebuffer,y)}else if(I){_.__webglDepthbuffer=[];for(let K=0;K<6;K++)t.bindFramebuffer(n.FRAMEBUFFER,_.__webglFramebuffer[K]),_.__webglDepthbuffer[K]=n.createRenderbuffer(),Ue(_.__webglDepthbuffer[K],y,!1)}else t.bindFramebuffer(n.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer=n.createRenderbuffer(),Ue(_.__webglDepthbuffer,y,!1);t.bindFramebuffer(n.FRAMEBUFFER,null)}function Ye(y,_,I){const K=i.get(y);_!==void 0&&ve(K.__webglFramebuffer,y,y.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),I!==void 0&&be(y)}function D(y){const _=y.texture,I=i.get(y),K=i.get(_);y.addEventListener("dispose",q),y.isWebGLMultipleRenderTargets!==!0&&(K.__webglTexture===void 0&&(K.__webglTexture=n.createTexture()),K.__version=_.version,o.memory.textures++);const j=y.isWebGLCubeRenderTarget===!0,Q=y.isWebGLMultipleRenderTargets===!0,_e=p(y)||a;if(j){I.__webglFramebuffer=[];for(let oe=0;oe<6;oe++)if(a&&_.mipmaps&&_.mipmaps.length>0){I.__webglFramebuffer[oe]=[];for(let he=0;he<_.mipmaps.length;he++)I.__webglFramebuffer[oe][he]=n.createFramebuffer()}else I.__webglFramebuffer[oe]=n.createFramebuffer()}else{if(a&&_.mipmaps&&_.mipmaps.length>0){I.__webglFramebuffer=[];for(let oe=0;oe<_.mipmaps.length;oe++)I.__webglFramebuffer[oe]=n.createFramebuffer()}else I.__webglFramebuffer=n.createFramebuffer();if(Q)if(r.drawBuffers){const oe=y.texture;for(let he=0,Te=oe.length;he<Te;he++){const ze=i.get(oe[he]);ze.__webglTexture===void 0&&(ze.__webglTexture=n.createTexture(),o.memory.textures++)}}else console.warn("THREE.WebGLRenderer: WebGLMultipleRenderTargets can only be used with WebGL2 or WEBGL_draw_buffers extension.");if(a&&y.samples>0&&me(y)===!1){const oe=Q?_:[_];I.__webglMultisampledFramebuffer=n.createFramebuffer(),I.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,I.__webglMultisampledFramebuffer);for(let he=0;he<oe.length;he++){const Te=oe[he];I.__webglColorRenderbuffer[he]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,I.__webglColorRenderbuffer[he]);const ze=s.convert(Te.format,Te.colorSpace),Y=s.convert(Te.type),Je=w(Te.internalFormat,ze,Y,Te.colorSpace,y.isXRRenderTarget===!0),Xe=Pe(y);n.renderbufferStorageMultisample(n.RENDERBUFFER,Xe,Je,y.width,y.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+he,n.RENDERBUFFER,I.__webglColorRenderbuffer[he])}n.bindRenderbuffer(n.RENDERBUFFER,null),y.depthBuffer&&(I.__webglDepthRenderbuffer=n.createRenderbuffer(),Ue(I.__webglDepthRenderbuffer,y,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(j){t.bindTexture(n.TEXTURE_CUBE_MAP,K.__webglTexture),k(n.TEXTURE_CUBE_MAP,_,_e);for(let oe=0;oe<6;oe++)if(a&&_.mipmaps&&_.mipmaps.length>0)for(let he=0;he<_.mipmaps.length;he++)ve(I.__webglFramebuffer[oe][he],y,_,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+oe,he);else ve(I.__webglFramebuffer[oe],y,_,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+oe,0);T(_,_e)&&x(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Q){const oe=y.texture;for(let he=0,Te=oe.length;he<Te;he++){const ze=oe[he],Y=i.get(ze);t.bindTexture(n.TEXTURE_2D,Y.__webglTexture),k(n.TEXTURE_2D,ze,_e),ve(I.__webglFramebuffer,y,ze,n.COLOR_ATTACHMENT0+he,n.TEXTURE_2D,0),T(ze,_e)&&x(n.TEXTURE_2D)}t.unbindTexture()}else{let oe=n.TEXTURE_2D;if((y.isWebGL3DRenderTarget||y.isWebGLArrayRenderTarget)&&(a?oe=y.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY:console.error("THREE.WebGLTextures: THREE.Data3DTexture and THREE.DataArrayTexture only supported with WebGL2.")),t.bindTexture(oe,K.__webglTexture),k(oe,_,_e),a&&_.mipmaps&&_.mipmaps.length>0)for(let he=0;he<_.mipmaps.length;he++)ve(I.__webglFramebuffer[he],y,_,n.COLOR_ATTACHMENT0,oe,he);else ve(I.__webglFramebuffer,y,_,n.COLOR_ATTACHMENT0,oe,0);T(_,_e)&&x(oe),t.unbindTexture()}y.depthBuffer&&be(y)}function bt(y){const _=p(y)||a,I=y.isWebGLMultipleRenderTargets===!0?y.texture:[y.texture];for(let K=0,j=I.length;K<j;K++){const Q=I[K];if(T(Q,_)){const _e=y.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:n.TEXTURE_2D,oe=i.get(Q).__webglTexture;t.bindTexture(_e,oe),x(_e),t.unbindTexture()}}}function Se(y){if(a&&y.samples>0&&me(y)===!1){const _=y.isWebGLMultipleRenderTargets?y.texture:[y.texture],I=y.width,K=y.height;let j=n.COLOR_BUFFER_BIT;const Q=[],_e=y.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,oe=i.get(y),he=y.isWebGLMultipleRenderTargets===!0;if(he)for(let Te=0;Te<_.length;Te++)t.bindFramebuffer(n.FRAMEBUFFER,oe.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Te,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,oe.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Te,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,oe.__webglMultisampledFramebuffer),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,oe.__webglFramebuffer);for(let Te=0;Te<_.length;Te++){Q.push(n.COLOR_ATTACHMENT0+Te),y.depthBuffer&&Q.push(_e);const ze=oe.__ignoreDepthValues!==void 0?oe.__ignoreDepthValues:!1;if(ze===!1&&(y.depthBuffer&&(j|=n.DEPTH_BUFFER_BIT),y.stencilBuffer&&(j|=n.STENCIL_BUFFER_BIT)),he&&n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,oe.__webglColorRenderbuffer[Te]),ze===!0&&(n.invalidateFramebuffer(n.READ_FRAMEBUFFER,[_e]),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[_e])),he){const Y=i.get(_[Te]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,Y,0)}n.blitFramebuffer(0,0,I,K,0,0,I,K,j,n.NEAREST),l&&n.invalidateFramebuffer(n.READ_FRAMEBUFFER,Q)}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),he)for(let Te=0;Te<_.length;Te++){t.bindFramebuffer(n.FRAMEBUFFER,oe.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Te,n.RENDERBUFFER,oe.__webglColorRenderbuffer[Te]);const ze=i.get(_[Te]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,oe.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Te,n.TEXTURE_2D,ze,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,oe.__webglMultisampledFramebuffer)}}function Pe(y){return Math.min(r.maxSamples,y.samples)}function me(y){const _=i.get(y);return a&&y.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function st(y){const _=o.render.frame;u.get(y)!==_&&(u.set(y,_),y.update())}function Be(y,_){const I=y.colorSpace,K=y.format,j=y.type;return y.isCompressedTexture===!0||y.isVideoTexture===!0||y.format===Os||I!==mn&&I!==Ht&&(Qe.getTransfer(I)===it?a===!1?e.has("EXT_sRGB")===!0&&K===Ft?(y.format=Os,y.minFilter=Lt,y.generateMipmaps=!1):_=cc.sRGBToLinear(_):(K!==Ft||j!==Jt)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",I)),_}this.allocateTextureUnit=C,this.resetTextureUnits=ie,this.setTexture2D=G,this.setTexture2DArray=W,this.setTexture3D=V,this.setTextureCube=H,this.rebindTextures=Ye,this.setupRenderTarget=D,this.updateRenderTargetMipmap=bt,this.updateMultisampleRenderTarget=Se,this.setupDepthRenderbuffer=be,this.setupFrameBufferTexture=ve,this.useMultisampledRTT=me}function wm(n,e,t){const i=t.isWebGL2;function r(s,o=Ht){let a;const c=Qe.getTransfer(o);if(s===Jt)return n.UNSIGNED_BYTE;if(s===Ko)return n.UNSIGNED_SHORT_4_4_4_4;if(s===Jo)return n.UNSIGNED_SHORT_5_5_5_1;if(s===lu)return n.BYTE;if(s===uu)return n.SHORT;if(s===Ws)return n.UNSIGNED_SHORT;if(s===$o)return n.INT;if(s===bn)return n.UNSIGNED_INT;if(s===An)return n.FLOAT;if(s===Gi)return i?n.HALF_FLOAT:(a=e.get("OES_texture_half_float"),a!==null?a.HALF_FLOAT_OES:null);if(s===du)return n.ALPHA;if(s===Ft)return n.RGBA;if(s===hu)return n.LUMINANCE;if(s===fu)return n.LUMINANCE_ALPHA;if(s===Vn)return n.DEPTH_COMPONENT;if(s===Ti)return n.DEPTH_STENCIL;if(s===Os)return a=e.get("EXT_sRGB"),a!==null?a.SRGB_ALPHA_EXT:null;if(s===pu)return n.RED;if(s===Qo)return n.RED_INTEGER;if(s===mu)return n.RG;if(s===ec)return n.RG_INTEGER;if(s===tc)return n.RGBA_INTEGER;if(s===qr||s===Yr||s===Zr||s===jr)if(c===it)if(a=e.get("WEBGL_compressed_texture_s3tc_srgb"),a!==null){if(s===qr)return a.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(s===Yr)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(s===Zr)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(s===jr)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(a=e.get("WEBGL_compressed_texture_s3tc"),a!==null){if(s===qr)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(s===Yr)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(s===Zr)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(s===jr)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(s===Ea||s===Ta||s===ba||s===Aa)if(a=e.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(s===Ea)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(s===Ta)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(s===ba)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(s===Aa)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(s===nc)return a=e.get("WEBGL_compressed_texture_etc1"),a!==null?a.COMPRESSED_RGB_ETC1_WEBGL:null;if(s===wa||s===Ra)if(a=e.get("WEBGL_compressed_texture_etc"),a!==null){if(s===wa)return c===it?a.COMPRESSED_SRGB8_ETC2:a.COMPRESSED_RGB8_ETC2;if(s===Ra)return c===it?a.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:a.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(s===Ca||s===La||s===Pa||s===Da||s===Ua||s===Ia||s===Na||s===Oa||s===Fa||s===Ba||s===za||s===ka||s===Ga||s===Ha)if(a=e.get("WEBGL_compressed_texture_astc"),a!==null){if(s===Ca)return c===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:a.COMPRESSED_RGBA_ASTC_4x4_KHR;if(s===La)return c===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:a.COMPRESSED_RGBA_ASTC_5x4_KHR;if(s===Pa)return c===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:a.COMPRESSED_RGBA_ASTC_5x5_KHR;if(s===Da)return c===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:a.COMPRESSED_RGBA_ASTC_6x5_KHR;if(s===Ua)return c===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:a.COMPRESSED_RGBA_ASTC_6x6_KHR;if(s===Ia)return c===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:a.COMPRESSED_RGBA_ASTC_8x5_KHR;if(s===Na)return c===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:a.COMPRESSED_RGBA_ASTC_8x6_KHR;if(s===Oa)return c===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:a.COMPRESSED_RGBA_ASTC_8x8_KHR;if(s===Fa)return c===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:a.COMPRESSED_RGBA_ASTC_10x5_KHR;if(s===Ba)return c===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:a.COMPRESSED_RGBA_ASTC_10x6_KHR;if(s===za)return c===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:a.COMPRESSED_RGBA_ASTC_10x8_KHR;if(s===ka)return c===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:a.COMPRESSED_RGBA_ASTC_10x10_KHR;if(s===Ga)return c===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:a.COMPRESSED_RGBA_ASTC_12x10_KHR;if(s===Ha)return c===it?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:a.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(s===$r||s===Va||s===Wa)if(a=e.get("EXT_texture_compression_bptc"),a!==null){if(s===$r)return c===it?a.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:a.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(s===Va)return a.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(s===Wa)return a.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(s===_u||s===Xa||s===qa||s===Ya)if(a=e.get("EXT_texture_compression_rgtc"),a!==null){if(s===$r)return a.COMPRESSED_RED_RGTC1_EXT;if(s===Xa)return a.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(s===qa)return a.COMPRESSED_RED_GREEN_RGTC2_EXT;if(s===Ya)return a.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return s===Hn?i?n.UNSIGNED_INT_24_8:(a=e.get("WEBGL_depth_texture"),a!==null?a.UNSIGNED_INT_24_8_WEBGL:null):n[s]!==void 0?n[s]:null}return{convert:r}}class Rm extends Dt{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}}class Oi extends St{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Cm={type:"move"};class Ss{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Oi,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Oi,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new N,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new N),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Oi,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new N,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new N),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let r=null,s=null,o=null;const a=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){o=!0;for(const v of e.hand.values()){const p=t.getJointPose(v,i),d=this._getHandJoint(l,v);p!==null&&(d.matrix.fromArray(p.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,d.jointRadius=p.radius),d.visible=p!==null}const u=l.joints["index-finger-tip"],h=l.joints["thumb-tip"],f=u.position.distanceTo(h.position),m=.02,g=.005;l.inputState.pinching&&f>m+g?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&f<=m-g&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,i),s!==null&&(c.matrix.fromArray(s.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,s.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(s.linearVelocity)):c.hasLinearVelocity=!1,s.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(s.angularVelocity)):c.hasAngularVelocity=!1));a!==null&&(r=t.getPose(e.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(a.matrix.fromArray(r.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,r.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(r.linearVelocity)):a.hasLinearVelocity=!1,r.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(r.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Cm)))}return a!==null&&(a.visible=r!==null),c!==null&&(c.visible=s!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new Oi;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}class Lm extends Ai{constructor(e,t){super();const i=this;let r=null,s=1,o=null,a="local-floor",c=1,l=null,u=null,h=null,f=null,m=null,g=null;const v=t.getContextAttributes();let p=null,d=null;const T=[],x=[],w=new $e;let P=null;const R=new Dt;R.layers.enable(1),R.viewport=new vt;const A=new Dt;A.layers.enable(2),A.viewport=new vt;const q=[R,A],S=new Rm;S.layers.enable(1),S.layers.enable(2);let E=null,z=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(k){let X=T[k];return X===void 0&&(X=new Ss,T[k]=X),X.getTargetRaySpace()},this.getControllerGrip=function(k){let X=T[k];return X===void 0&&(X=new Ss,T[k]=X),X.getGripSpace()},this.getHand=function(k){let X=T[k];return X===void 0&&(X=new Ss,T[k]=X),X.getHandSpace()};function Z(k){const X=x.indexOf(k.inputSource);if(X===-1)return;const ce=T[X];ce!==void 0&&(ce.update(k.inputSource,k.frame,l||o),ce.dispatchEvent({type:k.type,data:k.inputSource}))}function ie(){r.removeEventListener("select",Z),r.removeEventListener("selectstart",Z),r.removeEventListener("selectend",Z),r.removeEventListener("squeeze",Z),r.removeEventListener("squeezestart",Z),r.removeEventListener("squeezeend",Z),r.removeEventListener("end",ie),r.removeEventListener("inputsourceschange",C);for(let k=0;k<T.length;k++){const X=x[k];X!==null&&(x[k]=null,T[k].disconnect(X))}E=null,z=null,e.setRenderTarget(p),m=null,f=null,h=null,r=null,d=null,ue.stop(),i.isPresenting=!1,e.setPixelRatio(P),e.setSize(w.width,w.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(k){s=k,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(k){a=k,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(k){l=k},this.getBaseLayer=function(){return f!==null?f:m},this.getBinding=function(){return h},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(k){if(r=k,r!==null){if(p=e.getRenderTarget(),r.addEventListener("select",Z),r.addEventListener("selectstart",Z),r.addEventListener("selectend",Z),r.addEventListener("squeeze",Z),r.addEventListener("squeezestart",Z),r.addEventListener("squeezeend",Z),r.addEventListener("end",ie),r.addEventListener("inputsourceschange",C),v.xrCompatible!==!0&&await t.makeXRCompatible(),P=e.getPixelRatio(),e.getSize(w),r.renderState.layers===void 0||e.capabilities.isWebGL2===!1){const X={antialias:r.renderState.layers===void 0?v.antialias:!0,alpha:!0,depth:v.depth,stencil:v.stencil,framebufferScaleFactor:s};m=new XRWebGLLayer(r,t,X),r.updateRenderState({baseLayer:m}),e.setPixelRatio(1),e.setSize(m.framebufferWidth,m.framebufferHeight,!1),d=new _n(m.framebufferWidth,m.framebufferHeight,{format:Ft,type:Jt,colorSpace:e.outputColorSpace,stencilBuffer:v.stencil})}else{let X=null,ce=null,xe=null;v.depth&&(xe=v.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,X=v.stencil?Ti:Vn,ce=v.stencil?Hn:bn);const ve={colorFormat:t.RGBA8,depthFormat:xe,scaleFactor:s};h=new XRWebGLBinding(r,t),f=h.createProjectionLayer(ve),r.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),d=new _n(f.textureWidth,f.textureHeight,{format:Ft,type:Jt,depthTexture:new Sc(f.textureWidth,f.textureHeight,ce,void 0,void 0,void 0,void 0,void 0,void 0,X),stencilBuffer:v.stencil,colorSpace:e.outputColorSpace,samples:v.antialias?4:0});const Ue=e.properties.get(d);Ue.__ignoreDepthValues=f.ignoreDepthValues}d.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await r.requestReferenceSpace(a),ue.setContext(r),ue.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode};function C(k){for(let X=0;X<k.removed.length;X++){const ce=k.removed[X],xe=x.indexOf(ce);xe>=0&&(x[xe]=null,T[xe].disconnect(ce))}for(let X=0;X<k.added.length;X++){const ce=k.added[X];let xe=x.indexOf(ce);if(xe===-1){for(let Ue=0;Ue<T.length;Ue++)if(Ue>=x.length){x.push(ce),xe=Ue;break}else if(x[Ue]===null){x[Ue]=ce,xe=Ue;break}if(xe===-1)break}const ve=T[xe];ve&&ve.connect(ce)}}const F=new N,G=new N;function W(k,X,ce){F.setFromMatrixPosition(X.matrixWorld),G.setFromMatrixPosition(ce.matrixWorld);const xe=F.distanceTo(G),ve=X.projectionMatrix.elements,Ue=ce.projectionMatrix.elements,Ne=ve[14]/(ve[10]-1),be=ve[14]/(ve[10]+1),Ye=(ve[9]+1)/ve[5],D=(ve[9]-1)/ve[5],bt=(ve[8]-1)/ve[0],Se=(Ue[8]+1)/Ue[0],Pe=Ne*bt,me=Ne*Se,st=xe/(-bt+Se),Be=st*-bt;X.matrixWorld.decompose(k.position,k.quaternion,k.scale),k.translateX(Be),k.translateZ(st),k.matrixWorld.compose(k.position,k.quaternion,k.scale),k.matrixWorldInverse.copy(k.matrixWorld).invert();const y=Ne+st,_=be+st,I=Pe-Be,K=me+(xe-Be),j=Ye*be/_*y,Q=D*be/_*y;k.projectionMatrix.makePerspective(I,K,j,Q,y,_),k.projectionMatrixInverse.copy(k.projectionMatrix).invert()}function V(k,X){X===null?k.matrixWorld.copy(k.matrix):k.matrixWorld.multiplyMatrices(X.matrixWorld,k.matrix),k.matrixWorldInverse.copy(k.matrixWorld).invert()}this.updateCamera=function(k){if(r===null)return;S.near=A.near=R.near=k.near,S.far=A.far=R.far=k.far,(E!==S.near||z!==S.far)&&(r.updateRenderState({depthNear:S.near,depthFar:S.far}),E=S.near,z=S.far);const X=k.parent,ce=S.cameras;V(S,X);for(let xe=0;xe<ce.length;xe++)V(ce[xe],X);ce.length===2?W(S,R,A):S.projectionMatrix.copy(R.projectionMatrix),H(k,S,X)};function H(k,X,ce){ce===null?k.matrix.copy(X.matrixWorld):(k.matrix.copy(ce.matrixWorld),k.matrix.invert(),k.matrix.multiply(X.matrixWorld)),k.matrix.decompose(k.position,k.quaternion,k.scale),k.updateMatrixWorld(!0),k.projectionMatrix.copy(X.projectionMatrix),k.projectionMatrixInverse.copy(X.projectionMatrixInverse),k.isPerspectiveCamera&&(k.fov=Fs*2*Math.atan(1/k.projectionMatrix.elements[5]),k.zoom=1)}this.getCamera=function(){return S},this.getFoveation=function(){if(!(f===null&&m===null))return c},this.setFoveation=function(k){c=k,f!==null&&(f.fixedFoveation=k),m!==null&&m.fixedFoveation!==void 0&&(m.fixedFoveation=k)};let $=null;function ee(k,X){if(u=X.getViewerPose(l||o),g=X,u!==null){const ce=u.views;m!==null&&(e.setRenderTargetFramebuffer(d,m.framebuffer),e.setRenderTarget(d));let xe=!1;ce.length!==S.cameras.length&&(S.cameras.length=0,xe=!0);for(let ve=0;ve<ce.length;ve++){const Ue=ce[ve];let Ne=null;if(m!==null)Ne=m.getViewport(Ue);else{const Ye=h.getViewSubImage(f,Ue);Ne=Ye.viewport,ve===0&&(e.setRenderTargetTextures(d,Ye.colorTexture,f.ignoreDepthValues?void 0:Ye.depthStencilTexture),e.setRenderTarget(d))}let be=q[ve];be===void 0&&(be=new Dt,be.layers.enable(ve),be.viewport=new vt,q[ve]=be),be.matrix.fromArray(Ue.transform.matrix),be.matrix.decompose(be.position,be.quaternion,be.scale),be.projectionMatrix.fromArray(Ue.projectionMatrix),be.projectionMatrixInverse.copy(be.projectionMatrix).invert(),be.viewport.set(Ne.x,Ne.y,Ne.width,Ne.height),ve===0&&(S.matrix.copy(be.matrix),S.matrix.decompose(S.position,S.quaternion,S.scale)),xe===!0&&S.cameras.push(be)}}for(let ce=0;ce<T.length;ce++){const xe=x[ce],ve=T[ce];xe!==null&&ve!==void 0&&ve.update(xe,X,l||o)}$&&$(k,X),X.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:X}),g=null}const ue=new xc;ue.setAnimationLoop(ee),this.setAnimationLoop=function(k){$=k},this.dispose=function(){}}}function Pm(n,e){function t(p,d){p.matrixAutoUpdate===!0&&p.updateMatrix(),d.value.copy(p.matrix)}function i(p,d){d.color.getRGB(p.fogColor.value,_c(n)),d.isFog?(p.fogNear.value=d.near,p.fogFar.value=d.far):d.isFogExp2&&(p.fogDensity.value=d.density)}function r(p,d,T,x,w){d.isMeshBasicMaterial||d.isMeshLambertMaterial?s(p,d):d.isMeshToonMaterial?(s(p,d),h(p,d)):d.isMeshPhongMaterial?(s(p,d),u(p,d)):d.isMeshStandardMaterial?(s(p,d),f(p,d),d.isMeshPhysicalMaterial&&m(p,d,w)):d.isMeshMatcapMaterial?(s(p,d),g(p,d)):d.isMeshDepthMaterial?s(p,d):d.isMeshDistanceMaterial?(s(p,d),v(p,d)):d.isMeshNormalMaterial?s(p,d):d.isLineBasicMaterial?(o(p,d),d.isLineDashedMaterial&&a(p,d)):d.isPointsMaterial?c(p,d,T,x):d.isSpriteMaterial?l(p,d):d.isShadowMaterial?(p.color.value.copy(d.color),p.opacity.value=d.opacity):d.isShaderMaterial&&(d.uniformsNeedUpdate=!1)}function s(p,d){p.opacity.value=d.opacity,d.color&&p.diffuse.value.copy(d.color),d.emissive&&p.emissive.value.copy(d.emissive).multiplyScalar(d.emissiveIntensity),d.map&&(p.map.value=d.map,t(d.map,p.mapTransform)),d.alphaMap&&(p.alphaMap.value=d.alphaMap,t(d.alphaMap,p.alphaMapTransform)),d.bumpMap&&(p.bumpMap.value=d.bumpMap,t(d.bumpMap,p.bumpMapTransform),p.bumpScale.value=d.bumpScale,d.side===Ut&&(p.bumpScale.value*=-1)),d.normalMap&&(p.normalMap.value=d.normalMap,t(d.normalMap,p.normalMapTransform),p.normalScale.value.copy(d.normalScale),d.side===Ut&&p.normalScale.value.negate()),d.displacementMap&&(p.displacementMap.value=d.displacementMap,t(d.displacementMap,p.displacementMapTransform),p.displacementScale.value=d.displacementScale,p.displacementBias.value=d.displacementBias),d.emissiveMap&&(p.emissiveMap.value=d.emissiveMap,t(d.emissiveMap,p.emissiveMapTransform)),d.specularMap&&(p.specularMap.value=d.specularMap,t(d.specularMap,p.specularMapTransform)),d.alphaTest>0&&(p.alphaTest.value=d.alphaTest);const T=e.get(d).envMap;if(T&&(p.envMap.value=T,p.flipEnvMap.value=T.isCubeTexture&&T.isRenderTargetTexture===!1?-1:1,p.reflectivity.value=d.reflectivity,p.ior.value=d.ior,p.refractionRatio.value=d.refractionRatio),d.lightMap){p.lightMap.value=d.lightMap;const x=n._useLegacyLights===!0?Math.PI:1;p.lightMapIntensity.value=d.lightMapIntensity*x,t(d.lightMap,p.lightMapTransform)}d.aoMap&&(p.aoMap.value=d.aoMap,p.aoMapIntensity.value=d.aoMapIntensity,t(d.aoMap,p.aoMapTransform))}function o(p,d){p.diffuse.value.copy(d.color),p.opacity.value=d.opacity,d.map&&(p.map.value=d.map,t(d.map,p.mapTransform))}function a(p,d){p.dashSize.value=d.dashSize,p.totalSize.value=d.dashSize+d.gapSize,p.scale.value=d.scale}function c(p,d,T,x){p.diffuse.value.copy(d.color),p.opacity.value=d.opacity,p.size.value=d.size*T,p.scale.value=x*.5,d.map&&(p.map.value=d.map,t(d.map,p.uvTransform)),d.alphaMap&&(p.alphaMap.value=d.alphaMap,t(d.alphaMap,p.alphaMapTransform)),d.alphaTest>0&&(p.alphaTest.value=d.alphaTest)}function l(p,d){p.diffuse.value.copy(d.color),p.opacity.value=d.opacity,p.rotation.value=d.rotation,d.map&&(p.map.value=d.map,t(d.map,p.mapTransform)),d.alphaMap&&(p.alphaMap.value=d.alphaMap,t(d.alphaMap,p.alphaMapTransform)),d.alphaTest>0&&(p.alphaTest.value=d.alphaTest)}function u(p,d){p.specular.value.copy(d.specular),p.shininess.value=Math.max(d.shininess,1e-4)}function h(p,d){d.gradientMap&&(p.gradientMap.value=d.gradientMap)}function f(p,d){p.metalness.value=d.metalness,d.metalnessMap&&(p.metalnessMap.value=d.metalnessMap,t(d.metalnessMap,p.metalnessMapTransform)),p.roughness.value=d.roughness,d.roughnessMap&&(p.roughnessMap.value=d.roughnessMap,t(d.roughnessMap,p.roughnessMapTransform)),e.get(d).envMap&&(p.envMapIntensity.value=d.envMapIntensity)}function m(p,d,T){p.ior.value=d.ior,d.sheen>0&&(p.sheenColor.value.copy(d.sheenColor).multiplyScalar(d.sheen),p.sheenRoughness.value=d.sheenRoughness,d.sheenColorMap&&(p.sheenColorMap.value=d.sheenColorMap,t(d.sheenColorMap,p.sheenColorMapTransform)),d.sheenRoughnessMap&&(p.sheenRoughnessMap.value=d.sheenRoughnessMap,t(d.sheenRoughnessMap,p.sheenRoughnessMapTransform))),d.clearcoat>0&&(p.clearcoat.value=d.clearcoat,p.clearcoatRoughness.value=d.clearcoatRoughness,d.clearcoatMap&&(p.clearcoatMap.value=d.clearcoatMap,t(d.clearcoatMap,p.clearcoatMapTransform)),d.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=d.clearcoatRoughnessMap,t(d.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),d.clearcoatNormalMap&&(p.clearcoatNormalMap.value=d.clearcoatNormalMap,t(d.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(d.clearcoatNormalScale),d.side===Ut&&p.clearcoatNormalScale.value.negate())),d.iridescence>0&&(p.iridescence.value=d.iridescence,p.iridescenceIOR.value=d.iridescenceIOR,p.iridescenceThicknessMinimum.value=d.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=d.iridescenceThicknessRange[1],d.iridescenceMap&&(p.iridescenceMap.value=d.iridescenceMap,t(d.iridescenceMap,p.iridescenceMapTransform)),d.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=d.iridescenceThicknessMap,t(d.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),d.transmission>0&&(p.transmission.value=d.transmission,p.transmissionSamplerMap.value=T.texture,p.transmissionSamplerSize.value.set(T.width,T.height),d.transmissionMap&&(p.transmissionMap.value=d.transmissionMap,t(d.transmissionMap,p.transmissionMapTransform)),p.thickness.value=d.thickness,d.thicknessMap&&(p.thicknessMap.value=d.thicknessMap,t(d.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=d.attenuationDistance,p.attenuationColor.value.copy(d.attenuationColor)),d.anisotropy>0&&(p.anisotropyVector.value.set(d.anisotropy*Math.cos(d.anisotropyRotation),d.anisotropy*Math.sin(d.anisotropyRotation)),d.anisotropyMap&&(p.anisotropyMap.value=d.anisotropyMap,t(d.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=d.specularIntensity,p.specularColor.value.copy(d.specularColor),d.specularColorMap&&(p.specularColorMap.value=d.specularColorMap,t(d.specularColorMap,p.specularColorMapTransform)),d.specularIntensityMap&&(p.specularIntensityMap.value=d.specularIntensityMap,t(d.specularIntensityMap,p.specularIntensityMapTransform))}function g(p,d){d.matcap&&(p.matcap.value=d.matcap)}function v(p,d){const T=e.get(d).light;p.referencePosition.value.setFromMatrixPosition(T.matrixWorld),p.nearDistance.value=T.shadow.camera.near,p.farDistance.value=T.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function Dm(n,e,t,i){let r={},s={},o=[];const a=t.isWebGL2?n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS):0;function c(T,x){const w=x.program;i.uniformBlockBinding(T,w)}function l(T,x){let w=r[T.id];w===void 0&&(g(T),w=u(T),r[T.id]=w,T.addEventListener("dispose",p));const P=x.program;i.updateUBOMapping(T,P);const R=e.render.frame;s[T.id]!==R&&(f(T),s[T.id]=R)}function u(T){const x=h();T.__bindingPointIndex=x;const w=n.createBuffer(),P=T.__size,R=T.usage;return n.bindBuffer(n.UNIFORM_BUFFER,w),n.bufferData(n.UNIFORM_BUFFER,P,R),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,x,w),w}function h(){for(let T=0;T<a;T++)if(o.indexOf(T)===-1)return o.push(T),T;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(T){const x=r[T.id],w=T.uniforms,P=T.__cache;n.bindBuffer(n.UNIFORM_BUFFER,x);for(let R=0,A=w.length;R<A;R++){const q=Array.isArray(w[R])?w[R]:[w[R]];for(let S=0,E=q.length;S<E;S++){const z=q[S];if(m(z,R,S,P)===!0){const Z=z.__offset,ie=Array.isArray(z.value)?z.value:[z.value];let C=0;for(let F=0;F<ie.length;F++){const G=ie[F],W=v(G);typeof G=="number"||typeof G=="boolean"?(z.__data[0]=G,n.bufferSubData(n.UNIFORM_BUFFER,Z+C,z.__data)):G.isMatrix3?(z.__data[0]=G.elements[0],z.__data[1]=G.elements[1],z.__data[2]=G.elements[2],z.__data[3]=0,z.__data[4]=G.elements[3],z.__data[5]=G.elements[4],z.__data[6]=G.elements[5],z.__data[7]=0,z.__data[8]=G.elements[6],z.__data[9]=G.elements[7],z.__data[10]=G.elements[8],z.__data[11]=0):(G.toArray(z.__data,C),C+=W.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,Z,z.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function m(T,x,w,P){const R=T.value,A=x+"_"+w;if(P[A]===void 0)return typeof R=="number"||typeof R=="boolean"?P[A]=R:P[A]=R.clone(),!0;{const q=P[A];if(typeof R=="number"||typeof R=="boolean"){if(q!==R)return P[A]=R,!0}else if(q.equals(R)===!1)return q.copy(R),!0}return!1}function g(T){const x=T.uniforms;let w=0;const P=16;for(let A=0,q=x.length;A<q;A++){const S=Array.isArray(x[A])?x[A]:[x[A]];for(let E=0,z=S.length;E<z;E++){const Z=S[E],ie=Array.isArray(Z.value)?Z.value:[Z.value];for(let C=0,F=ie.length;C<F;C++){const G=ie[C],W=v(G),V=w%P;V!==0&&P-V<W.boundary&&(w+=P-V),Z.__data=new Float32Array(W.storage/Float32Array.BYTES_PER_ELEMENT),Z.__offset=w,w+=W.storage}}}const R=w%P;return R>0&&(w+=P-R),T.__size=w,T.__cache={},this}function v(T){const x={boundary:0,storage:0};return typeof T=="number"||typeof T=="boolean"?(x.boundary=4,x.storage=4):T.isVector2?(x.boundary=8,x.storage=8):T.isVector3||T.isColor?(x.boundary=16,x.storage=12):T.isVector4?(x.boundary=16,x.storage=16):T.isMatrix3?(x.boundary=48,x.storage=48):T.isMatrix4?(x.boundary=64,x.storage=64):T.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",T),x}function p(T){const x=T.target;x.removeEventListener("dispose",p);const w=o.indexOf(x.__bindingPointIndex);o.splice(w,1),n.deleteBuffer(r[x.id]),delete r[x.id],delete s[x.id]}function d(){for(const T in r)n.deleteBuffer(r[T]);o=[],r={},s={}}return{bind:c,update:l,dispose:d}}class Rc{constructor(e={}){const{canvas:t=wu(),context:i=null,depth:r=!0,stencil:s=!0,alpha:o=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:h=!1}=e;this.isWebGLRenderer=!0;let f;i!==null?f=i.getContextAttributes().alpha:f=o;const m=new Uint32Array(4),g=new Int32Array(4);let v=null,p=null;const d=[],T=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Mt,this._useLegacyLights=!1,this.toneMapping=wn,this.toneMappingExposure=1;const x=this;let w=!1,P=0,R=0,A=null,q=-1,S=null;const E=new vt,z=new vt;let Z=null;const ie=new je(0);let C=0,F=t.width,G=t.height,W=1,V=null,H=null;const $=new vt(0,0,F,G),ee=new vt(0,0,F,G);let ue=!1;const k=new Ys;let X=!1,ce=!1,xe=null;const ve=new ht,Ue=new $e,Ne=new N,be={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function Ye(){return A===null?W:1}let D=i;function bt(M,L){for(let O=0;O<M.length;O++){const B=M[O],U=t.getContext(B,L);if(U!==null)return U}return null}try{const M={alpha:!0,depth:r,stencil:s,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:u,failIfMajorPerformanceCaveat:h};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Vs}`),t.addEventListener("webglcontextlost",te,!1),t.addEventListener("webglcontextrestored",b,!1),t.addEventListener("webglcontextcreationerror",re,!1),D===null){const L=["webgl2","webgl","experimental-webgl"];if(x.isWebGL1Renderer===!0&&L.shift(),D=bt(L,M),D===null)throw bt(L)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}typeof WebGLRenderingContext<"u"&&D instanceof WebGLRenderingContext&&console.warn("THREE.WebGLRenderer: WebGL 1 support was deprecated in r153 and will be removed in r163."),D.getShaderPrecisionFormat===void 0&&(D.getShaderPrecisionFormat=function(){return{rangeMin:1,rangeMax:1,precision:1}})}catch(M){throw console.error("THREE.WebGLRenderer: "+M.message),M}let Se,Pe,me,st,Be,y,_,I,K,j,Q,_e,oe,he,Te,ze,Y,Je,Xe,Le,Me,fe,Oe,Ke;function ot(){Se=new Vf(D),Pe=new Ff(D,Se,e),Se.init(Pe),fe=new wm(D,Se,Pe),me=new bm(D,Se,Pe),st=new qf(D),Be=new hm,y=new Am(D,Se,me,Be,Pe,fe,st),_=new zf(x),I=new Hf(x),K=new Qu(D,Pe),Oe=new Nf(D,Se,K,Pe),j=new Wf(D,K,st,Oe),Q=new $f(D,j,K,st),Xe=new jf(D,Pe,y),ze=new Bf(Be),_e=new dm(x,_,I,Se,Pe,Oe,ze),oe=new Pm(x,Be),he=new pm,Te=new Mm(Se,Pe),Je=new If(x,_,I,me,Q,f,c),Y=new Tm(x,Q,Pe),Ke=new Dm(D,st,Pe,me),Le=new Of(D,Se,st,Pe),Me=new Xf(D,Se,st,Pe),st.programs=_e.programs,x.capabilities=Pe,x.extensions=Se,x.properties=Be,x.renderLists=he,x.shadowMap=Y,x.state=me,x.info=st}ot();const He=new Lm(x,D);this.xr=He,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){const M=Se.get("WEBGL_lose_context");M&&M.loseContext()},this.forceContextRestore=function(){const M=Se.get("WEBGL_lose_context");M&&M.restoreContext()},this.getPixelRatio=function(){return W},this.setPixelRatio=function(M){M!==void 0&&(W=M,this.setSize(F,G,!1))},this.getSize=function(M){return M.set(F,G)},this.setSize=function(M,L,O=!0){if(He.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}F=M,G=L,t.width=Math.floor(M*W),t.height=Math.floor(L*W),O===!0&&(t.style.width=M+"px",t.style.height=L+"px"),this.setViewport(0,0,M,L)},this.getDrawingBufferSize=function(M){return M.set(F*W,G*W).floor()},this.setDrawingBufferSize=function(M,L,O){F=M,G=L,W=O,t.width=Math.floor(M*O),t.height=Math.floor(L*O),this.setViewport(0,0,M,L)},this.getCurrentViewport=function(M){return M.copy(E)},this.getViewport=function(M){return M.copy($)},this.setViewport=function(M,L,O,B){M.isVector4?$.set(M.x,M.y,M.z,M.w):$.set(M,L,O,B),me.viewport(E.copy($).multiplyScalar(W).floor())},this.getScissor=function(M){return M.copy(ee)},this.setScissor=function(M,L,O,B){M.isVector4?ee.set(M.x,M.y,M.z,M.w):ee.set(M,L,O,B),me.scissor(z.copy(ee).multiplyScalar(W).floor())},this.getScissorTest=function(){return ue},this.setScissorTest=function(M){me.setScissorTest(ue=M)},this.setOpaqueSort=function(M){V=M},this.setTransparentSort=function(M){H=M},this.getClearColor=function(M){return M.copy(Je.getClearColor())},this.setClearColor=function(){Je.setClearColor.apply(Je,arguments)},this.getClearAlpha=function(){return Je.getClearAlpha()},this.setClearAlpha=function(){Je.setClearAlpha.apply(Je,arguments)},this.clear=function(M=!0,L=!0,O=!0){let B=0;if(M){let U=!1;if(A!==null){const le=A.texture.format;U=le===tc||le===ec||le===Qo}if(U){const le=A.texture.type,ge=le===Jt||le===bn||le===Ws||le===Hn||le===Ko||le===Jo,Ee=Je.getClearColor(),Re=Je.getClearAlpha(),ke=Ee.r,De=Ee.g,Ie=Ee.b;ge?(m[0]=ke,m[1]=De,m[2]=Ie,m[3]=Re,D.clearBufferuiv(D.COLOR,0,m)):(g[0]=ke,g[1]=De,g[2]=Ie,g[3]=Re,D.clearBufferiv(D.COLOR,0,g))}else B|=D.COLOR_BUFFER_BIT}L&&(B|=D.DEPTH_BUFFER_BIT),O&&(B|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),D.clear(B)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",te,!1),t.removeEventListener("webglcontextrestored",b,!1),t.removeEventListener("webglcontextcreationerror",re,!1),he.dispose(),Te.dispose(),Be.dispose(),_.dispose(),I.dispose(),Q.dispose(),Oe.dispose(),Ke.dispose(),_e.dispose(),He.dispose(),He.removeEventListener("sessionstart",At),He.removeEventListener("sessionend",nt),xe&&(xe.dispose(),xe=null),wt.stop()};function te(M){M.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),w=!0}function b(){console.log("THREE.WebGLRenderer: Context Restored."),w=!1;const M=st.autoReset,L=Y.enabled,O=Y.autoUpdate,B=Y.needsUpdate,U=Y.type;ot(),st.autoReset=M,Y.enabled=L,Y.autoUpdate=O,Y.needsUpdate=B,Y.type=U}function re(M){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",M.statusMessage)}function se(M){const L=M.target;L.removeEventListener("dispose",se),Ae(L)}function Ae(M){ye(M),Be.remove(M)}function ye(M){const L=Be.get(M).programs;L!==void 0&&(L.forEach(function(O){_e.releaseProgram(O)}),M.isShaderMaterial&&_e.releaseShaderCache(M))}this.renderBufferDirect=function(M,L,O,B,U,le){L===null&&(L=be);const ge=U.isMesh&&U.matrixWorld.determinant()<0,Ee=Pc(M,L,O,B,U);me.setMaterial(B,ge);let Re=O.index,ke=1;if(B.wireframe===!0){if(Re=j.getWireframeAttribute(O),Re===void 0)return;ke=2}const De=O.drawRange,Ie=O.attributes.position;let lt=De.start*ke,It=(De.start+De.count)*ke;le!==null&&(lt=Math.max(lt,le.start*ke),It=Math.min(It,(le.start+le.count)*ke)),Re!==null?(lt=Math.max(lt,0),It=Math.min(It,Re.count)):Ie!=null&&(lt=Math.max(lt,0),It=Math.min(It,Ie.count));const _t=It-lt;if(_t<0||_t===1/0)return;Oe.setup(U,B,Ee,O,Re);let en,at=Le;if(Re!==null&&(en=K.get(Re),at=Me,at.setIndex(en)),U.isMesh)B.wireframe===!0?(me.setLineWidth(B.wireframeLinewidth*Ye()),at.setMode(D.LINES)):at.setMode(D.TRIANGLES);else if(U.isLine){let Ve=B.linewidth;Ve===void 0&&(Ve=1),me.setLineWidth(Ve*Ye()),U.isLineSegments?at.setMode(D.LINES):U.isLineLoop?at.setMode(D.LINE_LOOP):at.setMode(D.LINE_STRIP)}else U.isPoints?at.setMode(D.POINTS):U.isSprite&&at.setMode(D.TRIANGLES);if(U.isBatchedMesh)at.renderMultiDraw(U._multiDrawStarts,U._multiDrawCounts,U._multiDrawCount);else if(U.isInstancedMesh)at.renderInstances(lt,_t,U.count);else if(O.isInstancedBufferGeometry){const Ve=O._maxInstanceCount!==void 0?O._maxInstanceCount:1/0,Fr=Math.min(O.instanceCount,Ve);at.renderInstances(lt,_t,Fr)}else at.render(lt,_t)};function et(M,L,O){M.transparent===!0&&M.side===ln&&M.forceSinglePass===!1?(M.side=Ut,M.needsUpdate=!0,Yi(M,L,O),M.side=Ln,M.needsUpdate=!0,Yi(M,L,O),M.side=ln):Yi(M,L,O)}this.compile=function(M,L,O=null){O===null&&(O=M),p=Te.get(O),p.init(),T.push(p),O.traverseVisible(function(U){U.isLight&&U.layers.test(L.layers)&&(p.pushLight(U),U.castShadow&&p.pushShadow(U))}),M!==O&&M.traverseVisible(function(U){U.isLight&&U.layers.test(L.layers)&&(p.pushLight(U),U.castShadow&&p.pushShadow(U))}),p.setupLights(x._useLegacyLights);const B=new Set;return M.traverse(function(U){const le=U.material;if(le)if(Array.isArray(le))for(let ge=0;ge<le.length;ge++){const Ee=le[ge];et(Ee,O,U),B.add(Ee)}else et(le,O,U),B.add(le)}),T.pop(),p=null,B},this.compileAsync=function(M,L,O=null){const B=this.compile(M,L,O);return new Promise(U=>{function le(){if(B.forEach(function(ge){Be.get(ge).currentProgram.isReady()&&B.delete(ge)}),B.size===0){U(M);return}setTimeout(le,10)}Se.get("KHR_parallel_shader_compile")!==null?le():setTimeout(le,10)})};let tt=null;function mt(M){tt&&tt(M)}function At(){wt.stop()}function nt(){wt.start()}const wt=new xc;wt.setAnimationLoop(mt),typeof self<"u"&&wt.setContext(self),this.setAnimationLoop=function(M){tt=M,He.setAnimationLoop(M),M===null?wt.stop():wt.start()},He.addEventListener("sessionstart",At),He.addEventListener("sessionend",nt),this.render=function(M,L){if(L!==void 0&&L.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(w===!0)return;M.matrixWorldAutoUpdate===!0&&M.updateMatrixWorld(),L.parent===null&&L.matrixWorldAutoUpdate===!0&&L.updateMatrixWorld(),He.enabled===!0&&He.isPresenting===!0&&(He.cameraAutoUpdate===!0&&He.updateCamera(L),L=He.getCamera()),M.isScene===!0&&M.onBeforeRender(x,M,L,A),p=Te.get(M,T.length),p.init(),T.push(p),ve.multiplyMatrices(L.projectionMatrix,L.matrixWorldInverse),k.setFromProjectionMatrix(ve),ce=this.localClippingEnabled,X=ze.init(this.clippingPlanes,ce),v=he.get(M,d.length),v.init(),d.push(v),jt(M,L,0,x.sortObjects),v.finish(),x.sortObjects===!0&&v.sort(V,H),this.info.render.frame++,X===!0&&ze.beginShadows();const O=p.state.shadowsArray;if(Y.render(O,M,L),X===!0&&ze.endShadows(),this.info.autoReset===!0&&this.info.reset(),Je.render(v,M),p.setupLights(x._useLegacyLights),L.isArrayCamera){const B=L.cameras;for(let U=0,le=B.length;U<le;U++){const ge=B[U];$s(v,M,ge,ge.viewport)}}else $s(v,M,L);A!==null&&(y.updateMultisampleRenderTarget(A),y.updateRenderTargetMipmap(A)),M.isScene===!0&&M.onAfterRender(x,M,L),Oe.resetDefaultState(),q=-1,S=null,T.pop(),T.length>0?p=T[T.length-1]:p=null,d.pop(),d.length>0?v=d[d.length-1]:v=null};function jt(M,L,O,B){if(M.visible===!1)return;if(M.layers.test(L.layers)){if(M.isGroup)O=M.renderOrder;else if(M.isLOD)M.autoUpdate===!0&&M.update(L);else if(M.isLight)p.pushLight(M),M.castShadow&&p.pushShadow(M);else if(M.isSprite){if(!M.frustumCulled||k.intersectsSprite(M)){B&&Ne.setFromMatrixPosition(M.matrixWorld).applyMatrix4(ve);const ge=Q.update(M),Ee=M.material;Ee.visible&&v.push(M,ge,Ee,O,Ne.z,null)}}else if((M.isMesh||M.isLine||M.isPoints)&&(!M.frustumCulled||k.intersectsObject(M))){const ge=Q.update(M),Ee=M.material;if(B&&(M.boundingSphere!==void 0?(M.boundingSphere===null&&M.computeBoundingSphere(),Ne.copy(M.boundingSphere.center)):(ge.boundingSphere===null&&ge.computeBoundingSphere(),Ne.copy(ge.boundingSphere.center)),Ne.applyMatrix4(M.matrixWorld).applyMatrix4(ve)),Array.isArray(Ee)){const Re=ge.groups;for(let ke=0,De=Re.length;ke<De;ke++){const Ie=Re[ke],lt=Ee[Ie.materialIndex];lt&&lt.visible&&v.push(M,ge,lt,O,Ne.z,Ie)}}else Ee.visible&&v.push(M,ge,Ee,O,Ne.z,null)}}const le=M.children;for(let ge=0,Ee=le.length;ge<Ee;ge++)jt(le[ge],L,O,B)}function $s(M,L,O,B){const U=M.opaque,le=M.transmissive,ge=M.transparent;p.setupLightsView(O),X===!0&&ze.setGlobalState(x.clippingPlanes,O),le.length>0&&Lc(U,le,L,O),B&&me.viewport(E.copy(B)),U.length>0&&qi(U,L,O),le.length>0&&qi(le,L,O),ge.length>0&&qi(ge,L,O),me.buffers.depth.setTest(!0),me.buffers.depth.setMask(!0),me.buffers.color.setMask(!0),me.setPolygonOffset(!1)}function Lc(M,L,O,B){if((O.isScene===!0?O.overrideMaterial:null)!==null)return;const le=Pe.isWebGL2;xe===null&&(xe=new _n(1,1,{generateMipmaps:!0,type:Se.has("EXT_color_buffer_half_float")?Gi:Jt,minFilter:ki,samples:le?4:0})),x.getDrawingBufferSize(Ue),le?xe.setSize(Ue.x,Ue.y):xe.setSize(Bs(Ue.x),Bs(Ue.y));const ge=x.getRenderTarget();x.setRenderTarget(xe),x.getClearColor(ie),C=x.getClearAlpha(),C<1&&x.setClearColor(16777215,.5),x.clear();const Ee=x.toneMapping;x.toneMapping=wn,qi(M,O,B),y.updateMultisampleRenderTarget(xe),y.updateRenderTargetMipmap(xe);let Re=!1;for(let ke=0,De=L.length;ke<De;ke++){const Ie=L[ke],lt=Ie.object,It=Ie.geometry,_t=Ie.material,en=Ie.group;if(_t.side===ln&&lt.layers.test(B.layers)){const at=_t.side;_t.side=Ut,_t.needsUpdate=!0,Ks(lt,O,B,It,_t,en),_t.side=at,_t.needsUpdate=!0,Re=!0}}Re===!0&&(y.updateMultisampleRenderTarget(xe),y.updateRenderTargetMipmap(xe)),x.setRenderTarget(ge),x.setClearColor(ie,C),x.toneMapping=Ee}function qi(M,L,O){const B=L.isScene===!0?L.overrideMaterial:null;for(let U=0,le=M.length;U<le;U++){const ge=M[U],Ee=ge.object,Re=ge.geometry,ke=B===null?ge.material:B,De=ge.group;Ee.layers.test(O.layers)&&Ks(Ee,L,O,Re,ke,De)}}function Ks(M,L,O,B,U,le){M.onBeforeRender(x,L,O,B,U,le),M.modelViewMatrix.multiplyMatrices(O.matrixWorldInverse,M.matrixWorld),M.normalMatrix.getNormalMatrix(M.modelViewMatrix),U.onBeforeRender(x,L,O,B,M,le),U.transparent===!0&&U.side===ln&&U.forceSinglePass===!1?(U.side=Ut,U.needsUpdate=!0,x.renderBufferDirect(O,L,B,U,M,le),U.side=Ln,U.needsUpdate=!0,x.renderBufferDirect(O,L,B,U,M,le),U.side=ln):x.renderBufferDirect(O,L,B,U,M,le),M.onAfterRender(x,L,O,B,U,le)}function Yi(M,L,O){L.isScene!==!0&&(L=be);const B=Be.get(M),U=p.state.lights,le=p.state.shadowsArray,ge=U.state.version,Ee=_e.getParameters(M,U.state,le,L,O),Re=_e.getProgramCacheKey(Ee);let ke=B.programs;B.environment=M.isMeshStandardMaterial?L.environment:null,B.fog=L.fog,B.envMap=(M.isMeshStandardMaterial?I:_).get(M.envMap||B.environment),ke===void 0&&(M.addEventListener("dispose",se),ke=new Map,B.programs=ke);let De=ke.get(Re);if(De!==void 0){if(B.currentProgram===De&&B.lightsStateVersion===ge)return Qs(M,Ee),De}else Ee.uniforms=_e.getUniforms(M),M.onBuild(O,Ee,x),M.onBeforeCompile(Ee,x),De=_e.acquireProgram(Ee,Re),ke.set(Re,De),B.uniforms=Ee.uniforms;const Ie=B.uniforms;return(!M.isShaderMaterial&&!M.isRawShaderMaterial||M.clipping===!0)&&(Ie.clippingPlanes=ze.uniform),Qs(M,Ee),B.needsLights=Uc(M),B.lightsStateVersion=ge,B.needsLights&&(Ie.ambientLightColor.value=U.state.ambient,Ie.lightProbe.value=U.state.probe,Ie.directionalLights.value=U.state.directional,Ie.directionalLightShadows.value=U.state.directionalShadow,Ie.spotLights.value=U.state.spot,Ie.spotLightShadows.value=U.state.spotShadow,Ie.rectAreaLights.value=U.state.rectArea,Ie.ltc_1.value=U.state.rectAreaLTC1,Ie.ltc_2.value=U.state.rectAreaLTC2,Ie.pointLights.value=U.state.point,Ie.pointLightShadows.value=U.state.pointShadow,Ie.hemisphereLights.value=U.state.hemi,Ie.directionalShadowMap.value=U.state.directionalShadowMap,Ie.directionalShadowMatrix.value=U.state.directionalShadowMatrix,Ie.spotShadowMap.value=U.state.spotShadowMap,Ie.spotLightMatrix.value=U.state.spotLightMatrix,Ie.spotLightMap.value=U.state.spotLightMap,Ie.pointShadowMap.value=U.state.pointShadowMap,Ie.pointShadowMatrix.value=U.state.pointShadowMatrix),B.currentProgram=De,B.uniformsList=null,De}function Js(M){if(M.uniformsList===null){const L=M.currentProgram.getUniforms();M.uniformsList=gr.seqWithValue(L.seq,M.uniforms)}return M.uniformsList}function Qs(M,L){const O=Be.get(M);O.outputColorSpace=L.outputColorSpace,O.batching=L.batching,O.instancing=L.instancing,O.instancingColor=L.instancingColor,O.skinning=L.skinning,O.morphTargets=L.morphTargets,O.morphNormals=L.morphNormals,O.morphColors=L.morphColors,O.morphTargetsCount=L.morphTargetsCount,O.numClippingPlanes=L.numClippingPlanes,O.numIntersection=L.numClipIntersection,O.vertexAlphas=L.vertexAlphas,O.vertexTangents=L.vertexTangents,O.toneMapping=L.toneMapping}function Pc(M,L,O,B,U){L.isScene!==!0&&(L=be),y.resetTextureUnits();const le=L.fog,ge=B.isMeshStandardMaterial?L.environment:null,Ee=A===null?x.outputColorSpace:A.isXRRenderTarget===!0?A.texture.colorSpace:mn,Re=(B.isMeshStandardMaterial?I:_).get(B.envMap||ge),ke=B.vertexColors===!0&&!!O.attributes.color&&O.attributes.color.itemSize===4,De=!!O.attributes.tangent&&(!!B.normalMap||B.anisotropy>0),Ie=!!O.morphAttributes.position,lt=!!O.morphAttributes.normal,It=!!O.morphAttributes.color;let _t=wn;B.toneMapped&&(A===null||A.isXRRenderTarget===!0)&&(_t=x.toneMapping);const en=O.morphAttributes.position||O.morphAttributes.normal||O.morphAttributes.color,at=en!==void 0?en.length:0,Ve=Be.get(B),Fr=p.state.lights;if(X===!0&&(ce===!0||M!==S)){const kt=M===S&&B.id===q;ze.setState(B,M,kt)}let ct=!1;B.version===Ve.__version?(Ve.needsLights&&Ve.lightsStateVersion!==Fr.state.version||Ve.outputColorSpace!==Ee||U.isBatchedMesh&&Ve.batching===!1||!U.isBatchedMesh&&Ve.batching===!0||U.isInstancedMesh&&Ve.instancing===!1||!U.isInstancedMesh&&Ve.instancing===!0||U.isSkinnedMesh&&Ve.skinning===!1||!U.isSkinnedMesh&&Ve.skinning===!0||U.isInstancedMesh&&Ve.instancingColor===!0&&U.instanceColor===null||U.isInstancedMesh&&Ve.instancingColor===!1&&U.instanceColor!==null||Ve.envMap!==Re||B.fog===!0&&Ve.fog!==le||Ve.numClippingPlanes!==void 0&&(Ve.numClippingPlanes!==ze.numPlanes||Ve.numIntersection!==ze.numIntersection)||Ve.vertexAlphas!==ke||Ve.vertexTangents!==De||Ve.morphTargets!==Ie||Ve.morphNormals!==lt||Ve.morphColors!==It||Ve.toneMapping!==_t||Pe.isWebGL2===!0&&Ve.morphTargetsCount!==at)&&(ct=!0):(ct=!0,Ve.__version=B.version);let Pn=Ve.currentProgram;ct===!0&&(Pn=Yi(B,L,U));let ea=!1,Ci=!1,Br=!1;const yt=Pn.getUniforms(),Dn=Ve.uniforms;if(me.useProgram(Pn.program)&&(ea=!0,Ci=!0,Br=!0),B.id!==q&&(q=B.id,Ci=!0),ea||S!==M){yt.setValue(D,"projectionMatrix",M.projectionMatrix),yt.setValue(D,"viewMatrix",M.matrixWorldInverse);const kt=yt.map.cameraPosition;kt!==void 0&&kt.setValue(D,Ne.setFromMatrixPosition(M.matrixWorld)),Pe.logarithmicDepthBuffer&&yt.setValue(D,"logDepthBufFC",2/(Math.log(M.far+1)/Math.LN2)),(B.isMeshPhongMaterial||B.isMeshToonMaterial||B.isMeshLambertMaterial||B.isMeshBasicMaterial||B.isMeshStandardMaterial||B.isShaderMaterial)&&yt.setValue(D,"isOrthographic",M.isOrthographicCamera===!0),S!==M&&(S=M,Ci=!0,Br=!0)}if(U.isSkinnedMesh){yt.setOptional(D,U,"bindMatrix"),yt.setOptional(D,U,"bindMatrixInverse");const kt=U.skeleton;kt&&(Pe.floatVertexTextures?(kt.boneTexture===null&&kt.computeBoneTexture(),yt.setValue(D,"boneTexture",kt.boneTexture,y)):console.warn("THREE.WebGLRenderer: SkinnedMesh can only be used with WebGL 2. With WebGL 1 OES_texture_float and vertex textures support is required."))}U.isBatchedMesh&&(yt.setOptional(D,U,"batchingTexture"),yt.setValue(D,"batchingTexture",U._matricesTexture,y));const zr=O.morphAttributes;if((zr.position!==void 0||zr.normal!==void 0||zr.color!==void 0&&Pe.isWebGL2===!0)&&Xe.update(U,O,Pn),(Ci||Ve.receiveShadow!==U.receiveShadow)&&(Ve.receiveShadow=U.receiveShadow,yt.setValue(D,"receiveShadow",U.receiveShadow)),B.isMeshGouraudMaterial&&B.envMap!==null&&(Dn.envMap.value=Re,Dn.flipEnvMap.value=Re.isCubeTexture&&Re.isRenderTargetTexture===!1?-1:1),Ci&&(yt.setValue(D,"toneMappingExposure",x.toneMappingExposure),Ve.needsLights&&Dc(Dn,Br),le&&B.fog===!0&&oe.refreshFogUniforms(Dn,le),oe.refreshMaterialUniforms(Dn,B,W,G,xe),gr.upload(D,Js(Ve),Dn,y)),B.isShaderMaterial&&B.uniformsNeedUpdate===!0&&(gr.upload(D,Js(Ve),Dn,y),B.uniformsNeedUpdate=!1),B.isSpriteMaterial&&yt.setValue(D,"center",U.center),yt.setValue(D,"modelViewMatrix",U.modelViewMatrix),yt.setValue(D,"normalMatrix",U.normalMatrix),yt.setValue(D,"modelMatrix",U.matrixWorld),B.isShaderMaterial||B.isRawShaderMaterial){const kt=B.uniformsGroups;for(let kr=0,Ic=kt.length;kr<Ic;kr++)if(Pe.isWebGL2){const ta=kt[kr];Ke.update(ta,Pn),Ke.bind(ta,Pn)}else console.warn("THREE.WebGLRenderer: Uniform Buffer Objects can only be used with WebGL 2.")}return Pn}function Dc(M,L){M.ambientLightColor.needsUpdate=L,M.lightProbe.needsUpdate=L,M.directionalLights.needsUpdate=L,M.directionalLightShadows.needsUpdate=L,M.pointLights.needsUpdate=L,M.pointLightShadows.needsUpdate=L,M.spotLights.needsUpdate=L,M.spotLightShadows.needsUpdate=L,M.rectAreaLights.needsUpdate=L,M.hemisphereLights.needsUpdate=L}function Uc(M){return M.isMeshLambertMaterial||M.isMeshToonMaterial||M.isMeshPhongMaterial||M.isMeshStandardMaterial||M.isShadowMaterial||M.isShaderMaterial&&M.lights===!0}this.getActiveCubeFace=function(){return P},this.getActiveMipmapLevel=function(){return R},this.getRenderTarget=function(){return A},this.setRenderTargetTextures=function(M,L,O){Be.get(M.texture).__webglTexture=L,Be.get(M.depthTexture).__webglTexture=O;const B=Be.get(M);B.__hasExternalTextures=!0,B.__hasExternalTextures&&(B.__autoAllocateDepthBuffer=O===void 0,B.__autoAllocateDepthBuffer||Se.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),B.__useRenderToTexture=!1))},this.setRenderTargetFramebuffer=function(M,L){const O=Be.get(M);O.__webglFramebuffer=L,O.__useDefaultFramebuffer=L===void 0},this.setRenderTarget=function(M,L=0,O=0){A=M,P=L,R=O;let B=!0,U=null,le=!1,ge=!1;if(M){const Re=Be.get(M);Re.__useDefaultFramebuffer!==void 0?(me.bindFramebuffer(D.FRAMEBUFFER,null),B=!1):Re.__webglFramebuffer===void 0?y.setupRenderTarget(M):Re.__hasExternalTextures&&y.rebindTextures(M,Be.get(M.texture).__webglTexture,Be.get(M.depthTexture).__webglTexture);const ke=M.texture;(ke.isData3DTexture||ke.isDataArrayTexture||ke.isCompressedArrayTexture)&&(ge=!0);const De=Be.get(M).__webglFramebuffer;M.isWebGLCubeRenderTarget?(Array.isArray(De[L])?U=De[L][O]:U=De[L],le=!0):Pe.isWebGL2&&M.samples>0&&y.useMultisampledRTT(M)===!1?U=Be.get(M).__webglMultisampledFramebuffer:Array.isArray(De)?U=De[O]:U=De,E.copy(M.viewport),z.copy(M.scissor),Z=M.scissorTest}else E.copy($).multiplyScalar(W).floor(),z.copy(ee).multiplyScalar(W).floor(),Z=ue;if(me.bindFramebuffer(D.FRAMEBUFFER,U)&&Pe.drawBuffers&&B&&me.drawBuffers(M,U),me.viewport(E),me.scissor(z),me.setScissorTest(Z),le){const Re=Be.get(M.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+L,Re.__webglTexture,O)}else if(ge){const Re=Be.get(M.texture),ke=L||0;D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,Re.__webglTexture,O||0,ke)}q=-1},this.readRenderTargetPixels=function(M,L,O,B,U,le,ge){if(!(M&&M.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ee=Be.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&ge!==void 0&&(Ee=Ee[ge]),Ee){me.bindFramebuffer(D.FRAMEBUFFER,Ee);try{const Re=M.texture,ke=Re.format,De=Re.type;if(ke!==Ft&&fe.convert(ke)!==D.getParameter(D.IMPLEMENTATION_COLOR_READ_FORMAT)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}const Ie=De===Gi&&(Se.has("EXT_color_buffer_half_float")||Pe.isWebGL2&&Se.has("EXT_color_buffer_float"));if(De!==Jt&&fe.convert(De)!==D.getParameter(D.IMPLEMENTATION_COLOR_READ_TYPE)&&!(De===An&&(Pe.isWebGL2||Se.has("OES_texture_float")||Se.has("WEBGL_color_buffer_float")))&&!Ie){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}L>=0&&L<=M.width-B&&O>=0&&O<=M.height-U&&D.readPixels(L,O,B,U,fe.convert(ke),fe.convert(De),le)}finally{const Re=A!==null?Be.get(A).__webglFramebuffer:null;me.bindFramebuffer(D.FRAMEBUFFER,Re)}}},this.copyFramebufferToTexture=function(M,L,O=0){const B=Math.pow(2,-O),U=Math.floor(L.image.width*B),le=Math.floor(L.image.height*B);y.setTexture2D(L,0),D.copyTexSubImage2D(D.TEXTURE_2D,O,0,0,M.x,M.y,U,le),me.unbindTexture()},this.copyTextureToTexture=function(M,L,O,B=0){const U=L.image.width,le=L.image.height,ge=fe.convert(O.format),Ee=fe.convert(O.type);y.setTexture2D(O,0),D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,O.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,O.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,O.unpackAlignment),L.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,B,M.x,M.y,U,le,ge,Ee,L.image.data):L.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,B,M.x,M.y,L.mipmaps[0].width,L.mipmaps[0].height,ge,L.mipmaps[0].data):D.texSubImage2D(D.TEXTURE_2D,B,M.x,M.y,ge,Ee,L.image),B===0&&O.generateMipmaps&&D.generateMipmap(D.TEXTURE_2D),me.unbindTexture()},this.copyTextureToTexture3D=function(M,L,O,B,U=0){if(x.isWebGL1Renderer){console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: can only be used with WebGL2.");return}const le=M.max.x-M.min.x+1,ge=M.max.y-M.min.y+1,Ee=M.max.z-M.min.z+1,Re=fe.convert(B.format),ke=fe.convert(B.type);let De;if(B.isData3DTexture)y.setTexture3D(B,0),De=D.TEXTURE_3D;else if(B.isDataArrayTexture||B.isCompressedArrayTexture)y.setTexture2DArray(B,0),De=D.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,B.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,B.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,B.unpackAlignment);const Ie=D.getParameter(D.UNPACK_ROW_LENGTH),lt=D.getParameter(D.UNPACK_IMAGE_HEIGHT),It=D.getParameter(D.UNPACK_SKIP_PIXELS),_t=D.getParameter(D.UNPACK_SKIP_ROWS),en=D.getParameter(D.UNPACK_SKIP_IMAGES),at=O.isCompressedTexture?O.mipmaps[U]:O.image;D.pixelStorei(D.UNPACK_ROW_LENGTH,at.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,at.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,M.min.x),D.pixelStorei(D.UNPACK_SKIP_ROWS,M.min.y),D.pixelStorei(D.UNPACK_SKIP_IMAGES,M.min.z),O.isDataTexture||O.isData3DTexture?D.texSubImage3D(De,U,L.x,L.y,L.z,le,ge,Ee,Re,ke,at.data):O.isCompressedArrayTexture?(console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: untested support for compressed srcTexture."),D.compressedTexSubImage3D(De,U,L.x,L.y,L.z,le,ge,Ee,Re,at.data)):D.texSubImage3D(De,U,L.x,L.y,L.z,le,ge,Ee,Re,ke,at),D.pixelStorei(D.UNPACK_ROW_LENGTH,Ie),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,lt),D.pixelStorei(D.UNPACK_SKIP_PIXELS,It),D.pixelStorei(D.UNPACK_SKIP_ROWS,_t),D.pixelStorei(D.UNPACK_SKIP_IMAGES,en),U===0&&B.generateMipmaps&&D.generateMipmap(De),me.unbindTexture()},this.initTexture=function(M){M.isCubeTexture?y.setTextureCube(M,0):M.isData3DTexture?y.setTexture3D(M,0):M.isDataArrayTexture||M.isCompressedArrayTexture?y.setTexture2DArray(M,0):y.setTexture2D(M,0),me.unbindTexture()},this.resetState=function(){P=0,R=0,A=null,me.reset(),Oe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return un}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=e===Xs?"display-p3":"srgb",t.unpackColorSpace=Qe.workingColorSpace===Ir?"display-p3":"srgb"}get outputEncoding(){return console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace===Mt?Wn:ic}set outputEncoding(e){console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace=e===Wn?Mt:mn}get useLegacyLights(){return console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights}set useLegacyLights(e){console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights=e}}class Um extends Rc{}Um.prototype.isWebGL1Renderer=!0;class Im extends St{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t}}class Nm extends Xi{constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new je(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new je(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=sc,this.normalScale=new $e(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Cc extends St{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new je(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),t}}const ys=new ht,Fo=new N,Bo=new N;class Om{constructor(e){this.camera=e,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new $e(512,512),this.map=null,this.mapPass=null,this.matrix=new ht,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Ys,this._frameExtents=new $e(1,1),this._viewportCount=1,this._viewports=[new vt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,i=this.matrix;Fo.setFromMatrixPosition(e.matrixWorld),t.position.copy(Fo),Bo.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Bo),t.updateMatrixWorld(),ys.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(ys),i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(ys)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class Fm extends Om{constructor(){super(new Mc(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Bm extends Cc{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(St.DEFAULT_UP),this.updateMatrix(),this.target=new St,this.shadow=new Fm}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class zm extends Cc{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Vs}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Vs);function km(n){const e=new Im;e.add(new zm(16777215,.5));const t=new Bm(16777215,1);t.position.set(50,100,50),e.add(t);const i=new Map;for(const r of n.vessels){const s=Gm(r);e.add(s),i.set(r.id,s)}return{scene:e,entities:i}}function Gm(n){const e=new Oi;e.name=n.id,e.userData={model:n.model};const t=new dn(new wi(20,4,6),new Nm({color:8421504}));t.name=`${n.id}__placeholder_hull`,e.add(t);for(const i of n.sensors)e.add(Hm(i));return e}function Hm(n){const e=new St;return e.name=n.id,e.userData={sensorType:n.type,config:n},Vm(e,n.mount),e}function Vm(n,e){n.position.set(e.x,e.y,e.z);const t=(e.yaw_deg??0)*Math.PI/180,i=(e.pitch_deg??0)*Math.PI/180,r=(e.roll_deg??0)*Math.PI/180;n.rotation.set(r,i,t,"ZYX")}gn({position:Cs([rt(),rt(),rt()]),orientation:Cs([rt(),rt(),rt(),rt()]),time:rt()});class Wm{constructor(){Zi(this,"queue",[]);Zi(this,"waiters",[]);Zi(this,"closed",!1)}push(e){if(this.closed)return;const t=this.waiters.shift();t?t({value:e,done:!1}):this.queue.push(e)}close(){if(!this.closed)for(this.closed=!0;this.waiters.length>0;)this.waiters.shift()({value:void 0,done:!0})}[Symbol.asyncIterator](){return{next:()=>{const e=this.queue.shift();return e!==void 0?Promise.resolve({value:e,done:!1}):this.closed?Promise.resolve({value:void 0,done:!0}):new Promise(t=>{this.waiters.push(t)})}}}}function Xm(n,e){const t=n.get(e.entityId);if(!t)return;const[i,r,s]=e.pose.position,[o,a,c,l]=e.pose.orientation;t.position.set(i,r,s),t.quaternion.set(o,a,c,l)}const qm=.1,Ym=5e3;function Zm(n){const[e,t]=n.config.resolution,i=new Dt(n.config.fov_deg,e/t,qm,Ym);n.sensorNode.add(i);const r=new _n(e,t,{minFilter:Lt,magFilter:Lt,format:Ft,type:Jt,depthBuffer:!0,stencilBuffer:!1}),s=new Uint8Array(e*t*4);return{camera:i,step(o){return n.renderer.setRenderTarget(r),n.renderer.render(n.scene,i),n.renderer.readRenderTargetPixels(r,0,0,e,t,s),n.renderer.setRenderTarget(null),{pixels:s,width:e,height:t,time:o}},dispose(){r.dispose(),n.sensorNode.remove(i)}}}const jm=90,$m=.1,Km=.999;function Jm(n){const e=n.fov_deg??jm,t=n.config.channels,i=n.config.range_m,r=t,s=t,o=new Dt(e,r/s,$m,i);n.sensorNode.add(o);const a=new _n(r,s,{minFilter:xt,magFilter:xt,format:Ft,type:Jt,depthBuffer:!0,stencilBuffer:!1}),c=new wc({depthPacking:rc,blending:fn}),l=new Uint8Array(r*s*4);return{camera:o,step(u){const h=n.scene.overrideMaterial;n.scene.overrideMaterial=c,n.renderer.setRenderTarget(a),n.renderer.render(n.scene,o),n.renderer.readRenderTargetPixels(a,0,0,r,s,l),n.renderer.setRenderTarget(null),n.scene.overrideMaterial=h;const f=Qm(l,r,s,o,i);return{points:f.points,count:f.count,time:u}},dispose(){a.dispose(),c.dispose(),n.sensorNode.remove(o)}}}function Qm(n,e,t,i,r){const s=new Float32Array(e*t*3),o=new N,a=i.projectionMatrixInverse;let c=0;for(let l=0;l<t;l++)for(let u=0;u<e;u++){const h=(l*e+u)*4,f=e_(n,h);if(f>=Km)continue;const m=(u+.5)/e*2-1,g=(l+.5)/t*2-1,v=f*2-1;o.set(m,g,v).applyMatrix4(a),!(o.length()>r)&&(s[c*3+0]=o.x,s[c*3+1]=o.y,s[c*3+2]=o.z,c++)}return{points:s.subarray(0,c*3),count:c}}function e_(n,e){const t=n[e+0],i=n[e+1],r=n[e+2];return n[e+3]/256+r/65536+i/16777216+t/4294967296}const t_={name:"kiel_demo",anchor:{lat:54.3233,lon:10.1394,height:0},vessels:[{id:"ego",model:"tanker_120m",pose_source:{type:"zenoh",topic:"ego/pose"},sensors:[{id:"bow_camera",type:"camera",mount:{x:20,y:0,z:8},fov_deg:90,resolution:[640,480],rate_hz:10},{id:"main_lidar",type:"lidar",mount:{x:20,y:0,z:8},channels:32,range_m:200,rate_hz:10}]},{id:"ferry",model:"ferry_60m",pose_source:{type:"zenoh",topic:"ferry/pose"},sensors:[]}],modes:{rendering:"replace",clock:"wall",determinism:"relaxed"}};function n_(n){const{canvas:e,poses:t,onStats:i}=n,r=wl(t_),s=km(r);s.scene.background=new je(661030);const o=new Rc({canvas:e,antialias:!0});o.setPixelRatio(window.devicePixelRatio),zo(o,e);const a=new Dt(55,e.clientWidth/Math.max(1,e.clientHeight),.5,2e3);a.position.set(80,60,120),a.lookAt(0,0,0);const c=[];for(const x of r.vessels){const w=s.entities.get(x.id);if(w)for(const P of x.sensors){const R=w.getObjectByName(P.id);R&&(P.type==="camera"?c.push(Zm({renderer:o,scene:s.scene,sensorNode:R,config:P})):P.type==="lidar"&&c.push(Jm({renderer:o,scene:s.scene,sensorNode:R,config:P})))}}let l=!1,u=0,h=0,f=0,m=0,g=performance.now(),v=0,p=0;const d=(async()=>{for await(const x of t){if(l)break;Xm(s.entities,x)}})(),T=()=>{if(l)return;(e.clientWidth!==e.width||e.clientHeight!==e.height)&&(zo(o,e),a.aspect=e.clientWidth/Math.max(1,e.clientHeight),a.updateProjectionMatrix());const x=performance.now()/1e3;for(const P of c){const R=P.step(x);"pixels"in R?h+=1:f=R.count}o.setRenderTarget(null),o.render(s.scene,a),u+=1,v+=1;const w=performance.now();w-g>=500&&(m=v*1e3/(w-g),g=w,v=0,i==null||i({frames:u,fps:m,cameraFrames:h,lidarPoints:f})),p=requestAnimationFrame(T)};return p=requestAnimationFrame(T),{stop(){l=!0,cancelAnimationFrame(p),t.close(),d.catch(()=>{});for(const x of c)x.dispose();o.dispose()},stats:()=>({frames:u,fps:m,cameraFrames:h,lidarPoints:f})}}function zo(n,e){n.setSize(e.clientWidth,e.clientHeight,!1)}var i_=Bc('<main class="layout svelte-1uha8ag"><header class="svelte-1uha8ag"><h1 class="svelte-1uha8ag">Bino viewer</h1> <span class="stats svelte-1uha8ag"> </span></header> <canvas class="scene svelte-1uha8ag"></canvas></main>');function u_(n,e){Gc(e,!0);let t=na(void 0),i,r=na(Hc({frames:0,fps:0,cameraFrames:0,lidarPoints:0}));zc(()=>{if(!Un(t))return;const u=new Wm;i=n_({canvas:Un(t),poses:u,onStats:h=>{ra(r,h,!0)}})}),kc(()=>i==null?void 0:i.stop());var s=i_(),o=Gr(s),a=ia(Gr(o),2),c=Gr(a);Hr(a),Hr(o);var l=ia(o,2);qc(l,u=>ra(t,u),()=>Un(t)),Hr(s),Vc(u=>Xc(c,`${u??""} fps · ${Un(r).frames??""} frames · cam ${Un(r).cameraFrames??""} · lidar ${Un(r).lidarPoints??""} pts`),[()=>Un(r).fps.toFixed(1)]),Fc(n,s),Wc()}export{u_ as component};

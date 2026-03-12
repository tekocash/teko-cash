import{a,t as c,m as s}from"./index-X6TyhnX_.js";/**
 * @license lucide-react v0.477.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=[["path",{d:"m7 7 10 10",key:"1fmybs"}],["path",{d:"M17 7v10H7",key:"6fjiku"}]],f=a("ArrowDownRight",h);/**
 * @license lucide-react v0.477.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]],g=a("ArrowUpRight",d);function u(e,o){const t=c(e);if(isNaN(o))return s(e,NaN);if(!o)return t;const r=t.getDate(),n=s(e,t.getTime());n.setMonth(t.getMonth()+o+1,0);const i=n.getDate();return r>=i?n:(t.setFullYear(n.getFullYear(),n.getMonth(),r),t)}function p(e,o){return u(e,-o)}export{g as A,f as a,p as s};

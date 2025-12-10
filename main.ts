// main.ts - Part A: Definitions

// @ts-ignore
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
// @ts-ignore
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
// @ts-ignore
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// --- Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDP88Q4ux4pu0QAr_P88YWm95mOnRG61v0",
  authDomain: "sotc-a7c27.firebaseapp.com",
  projectId: "sotc-a7c27",
  storageBucket: "sotc-a7c27.firebasestorage.app",
  messagingSenderId: "734700816824",
  appId: "1:734700816824:web:64a0d3171e8a8b288ba74d"
};

// --- Interfaces ---

export interface ActiveEffect {
    name: string;
    type: 'Short' | 'Long' | 'Perm';
}

export interface InventoryItem {
    id: number;
    text: string;
}

export interface EquipmentItem {
    name: string;
    effect?: string;
    atkMod?: number;
    defMod?: number;
    spellMod?: number;
    aidMod?: number;
    weaponDmgMod?: number;
    magicDmgMod?: number;
    physicDmgRed?: number;
    magicDmgRed?: number;
}

export interface ActivePCData {
    id: string; 
    ownerId: string;
    lastActive: number;

    name: string;
    age: string;
    race: string;
    class: string;

    maxHp: number;
    currentHp: number;
    maxSp: number;
    currentSp: number;

    atkMod: number;
    defMod: number;
    spellMod: number;
    aidMod: number;
    stelMod: number;
    negoMod: number;
    persMod: number;
    knowMod: number;

    weaponDmgMod: number;
    magicDmgMod: number;
    physicDmgRed: number;
    magicDmgRed: number;

    equipment: { [slot: string]: EquipmentItem };

    miscMods: { stel: number, nego: number, pers: number, know: number, desc: string };

    inventory: InventoryItem[]; 
    money: { gold: number, silver: number };

    active_effects: ActiveEffect[];
    wishes: [string, string, string];
    background: string;
    growths: { maxHp: number, maxSp: number, skills: { [key: string]: number } };
}

// --- Constants ---
export const CLASS_DATA: { [key: string]: any } = {
    'WAR': { 
        maxHp: 10, maxSp: 1, 
        combat: { atkMod: 2, defMod: 1, spellMod: 0, aidMod: 0 }, 
        skills: { stelMod: 0, negoMod: 0, persMod: 0, knowMod: 0 } 
    },
    'SCT': { 
        maxHp: 10, maxSp: 1, 
        combat: { atkMod: 1, defMod: 0, spellMod: 0, aidMod: 0 }, 
        skills: { stelMod: 2, negoMod: 0, persMod: 2, knowMod: 0 } 
    },
    'MAG': { 
        maxHp: 8, maxSp: 3, 
        combat: { atkMod: 0, defMod: 0, spellMod: 2, aidMod: 0 }, 
        skills: { stelMod: 0, negoMod: 0, persMod: 1, knowMod: 2 } 
    },
    'HLR': { 
        maxHp: 8, maxSp: 3, 
        combat: { atkMod: 0, defMod: 0, spellMod: 2, aidMod: 0 }, 
        skills: { stelMod: 0, negoMod: 1, persMod: 0, knowMod: 1 } 
    },
};

export const EQUIPMENT_SLOTS = [
    { id: 'mainWeapon', label: 'Main Weapon' },
    { id: 'armor', label: 'Armor' },
    { id: 'subWeapon', label: 'Sub / Shield' },
    { id: 'accessory', label: 'Accessory' }
];

export const STATUS_TYPES: { [key: string]: string } = {
    'Poison': 'Short', 'Bleed': 'Short', 'Exhaust': 'Short', 'Stone1': 'Short', 'Fainted': 'Short',
    'ExPoison': 'Long', 'Disease': 'Long', 'Stone2': 'Long', 'Stone3': 'Long', 'Critical': 'Long',
    'Stone4': 'Perm', 'Curse': 'Perm'
};

export const SKILL_MAP: { [key: string]: keyof ActivePCData } = {
    '隠密': 'stelMod',
    '交渉': 'negoMod',
    '目星': 'persMod',
    '知識': 'knowMod'
};
export const SKILL_NAMES = Object.keys(SKILL_MAP);

// main.ts - Part B: Logic & Implementation

// App State
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser: any = null;
let currentDocId: string | null = null; 
let charData: ActivePCData = createEmptyData();

// DOM Cache
const els = {
    appStatus: { indicator: document.getElementById('status-indicator')!, text: document.getElementById('status-text')! },
    loadSelect: document.getElementById('char-load-select') as HTMLSelectElement,
    btnSave: document.getElementById('btn-save')!,
    inputs: {
        name: document.getElementById('char-name') as HTMLInputElement,
        age: document.getElementById('char-age') as HTMLInputElement,
        race: document.getElementById('char-race') as HTMLInputElement,
        class: document.getElementById('char-class') as HTMLSelectElement,
        hp: document.getElementById('char-current-hp') as HTMLInputElement,
        sp: document.getElementById('char-current-sp') as HTMLInputElement,
        gold: document.getElementById('money-gold') as HTMLInputElement,
        silver: document.getElementById('money-silver') as HTMLInputElement,
    },
    equipContainer: document.getElementById('equipment-container')!,
    toolBasket: {
        desc: document.getElementById('tool-desc') as HTMLInputElement,
        stel: document.getElementById('misc-stel') as HTMLInputElement,
        nego: document.getElementById('misc-nego') as HTMLInputElement,
        pers: document.getElementById('misc-pers') as HTMLInputElement,
        know: document.getElementById('misc-know') as HTMLInputElement,
    },
    conditionUI: {
        select: document.getElementById('condition-select') as HTMLSelectElement,
        btnAdd: document.getElementById('btn-add-condition')!,
        container: document.getElementById('condition-container')!
    },
    display: {
        maxHp: document.getElementById('disp-max-hp')!,
        maxSp: document.getElementById('disp-max-sp')!,
        growthHistory: document.getElementById('growth-history')!
    },
    growth: {
        select: document.getElementById('growth-select') as HTMLSelectElement,
        btn: document.getElementById('btn-growth')!
    },
    roll: {
        select: document.getElementById('roll-type') as HTMLSelectElement,
        btn: document.getElementById('btn-roll')!,
        result: document.getElementById('roll-result-area')!,
        history: document.getElementById('roll-history')!
    },
    inv: {
        name: document.getElementById('inv-name') as HTMLInputElement,
        addBtn: document.getElementById('btn-inv-add')!,
        list: document.getElementById('inventory-list')!
    },
    wishes: [
        document.getElementById('wish-1') as HTMLInputElement,
        document.getElementById('wish-2') as HTMLInputElement,
        document.getElementById('wish-3') as HTMLInputElement
    ],
    bg: document.getElementById('char-bg') as HTMLTextAreaElement,
    log: document.getElementById('log-window')!
};

// --- Initialization ---

signInAnonymously(auth).then(() => {
    onAuthStateChanged(auth, (user: any) => {
        if (user) {
            currentUser = user;
            els.appStatus.text.textContent = "Auth OK";
            loadCharacterList();
        } else {
            els.appStatus.text.textContent = "No Auth";
        }
    });
}).catch((error: any) => {
    console.error(error);
    els.appStatus.text.textContent = "Auth Err";
});

function createEmptyData(): ActivePCData {
    return {
        id: "", ownerId: "", lastActive: Date.now(),
        name: "", age: "", race: "", class: "",
        maxHp: 0, currentHp: 0, maxSp: 0, currentSp: 0,
        atkMod: 0, defMod: 0, spellMod: 0, aidMod: 0,
        stelMod: 0, negoMod: 0, persMod: 0, knowMod: 0,
        weaponDmgMod: 0, magicDmgMod: 0, physicDmgRed: 0, magicDmgRed: 0,
        equipment: {},
        miscMods: { stel: 0, nego: 0, pers: 0, know: 0, desc: "" },
        inventory: [],
        money: { gold: 0, silver: 10 },
        active_effects: [],
        wishes: ["", "", ""],
        background: "",
        growths: { maxHp: 0, maxSp: 0, skills: {} }
    };
}

// --- Setup UI ---

function setupUI() {
    // Equipment Generation
    els.equipContainer.innerHTML = '';
    EQUIPMENT_SLOTS.forEach(slot => {
        const div = document.createElement('div');
        div.className = "pb-2 border-b border-[#d7ccc8] last:border-0";
        // Inputs based on slot
        let statsInputs = '';
        if (slot.id === 'mainWeapon') {
            statsInputs = `<input type="number" class="input-box bg-red-50 w-12" placeholder="WD" data-slot="${slot.id}" data-field="weaponDmgMod">
                           <input type="number" class="input-box bg-red-50 w-12" placeholder="MD" data-slot="${slot.id}" data-field="magicDmgMod">`;
        } else if (slot.id === 'armor') {
            statsInputs = `<input type="number" class="input-box bg-blue-50 w-12" placeholder="PR" data-slot="${slot.id}" data-field="physicDmgRed">
                           <input type="number" class="input-box bg-blue-50 w-12" placeholder="MR" data-slot="${slot.id}" data-field="magicDmgRed">`;
        } else {
            statsInputs = `<input type="number" class="input-box w-10" placeholder="Def" data-slot="${slot.id}" data-field="defMod">
                           <input type="number" class="input-box w-10" placeholder="Spl" data-slot="${slot.id}" data-field="spellMod">
                           <input type="number" class="input-box w-10 bg-blue-50" placeholder="PR" data-slot="${slot.id}" data-field="physicDmgRed">`;
        }
        div.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <label class="label-mini">${slot.label}</label>
                <input type="text" class="input-line text-xs font-bold w-2/3" placeholder="Item" data-slot="${slot.id}" data-field="name">
            </div>
            <div class="flex gap-1 items-center">
                <input type="text" class="input-line text-[10px] italic text-gray-500 flex-1" placeholder="Effect" data-slot="${slot.id}" data-field="effect">
                <div class="flex gap-1">${statsInputs}</div>
            </div>`;
        els.equipContainer.appendChild(div);
    });

    // Event Binding
    // FIX 1: Cast charData to any to allow string indexing, fixing 'never' type error
    ['name','age','race'].forEach(k => els.inputs[k as keyof typeof els.inputs].addEventListener('change', (e: Event) => { 
        (charData as any)[k] = (e.target as HTMLInputElement).value; 
        render(); 
    }));

    els.inputs.class.addEventListener('change', (e: Event) => { charData.class = (e.target as HTMLSelectElement).value; render(); });
    ['hp','sp'].forEach(k => els.inputs[k as keyof typeof els.inputs].addEventListener('change', (e: Event) => { charData[k=='hp'?'currentHp':'currentSp'] = parseInt((e.target as HTMLInputElement).value)||0; render(); }));
    ['gold','silver'].forEach(k => els.inputs[k as keyof typeof els.inputs].addEventListener('change', (e: Event) => { charData.money[k as 'gold'|'silver'] = parseInt((e.target as HTMLInputElement).value)||0; }));

    ['stel','nego','pers','know'].forEach(k => els.toolBasket[k as keyof typeof els.toolBasket].addEventListener('change', (e: Event) => { charData.miscMods[k as any] = parseInt((e.target as HTMLInputElement).value)||0; render(); }));
    els.toolBasket.desc.addEventListener('change', (e: Event) => { charData.miscMods.desc = (e.target as HTMLInputElement).value; });

    els.equipContainer.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        if(target.tagName === 'INPUT') {
            const slot = target.dataset.slot!;
            const field = target.dataset.field!;
            const val = ['name','effect'].includes(field) ? target.value : (parseInt(target.value)||0);
            if(!charData.equipment[slot]) charData.equipment[slot] = { name: "" };
            (charData.equipment[slot] as any)[field] = val;
            render();
        }
    });

    els.conditionUI.btnAdd.addEventListener('click', () => {
        const val = els.conditionUI.select.value;
        if(val && !charData.active_effects.find(e => e.name === val)) {
            charData.active_effects.push({ name: val, type: STATUS_TYPES[val] as any });
            renderStatus();
        }
    });

    els.growth.btn.addEventListener('click', () => {
        const key = els.growth.select.value;
        if(key) {
            if(!charData.growths.skills[key]) charData.growths.skills[key] = 0;
            charData.growths.skills[key]++;
            render();
        }
    });
    document.querySelectorAll('.growth-btn').forEach(b => b.addEventListener('click', (e: Event) => {
        const t = (e.target as HTMLElement).dataset.target!;
        charData.growths[t as 'maxHp'|'maxSp']++;
        render();
    }));

    els.inv.addBtn.addEventListener('click', () => {
        if(charData.inventory.length >= 10) return alert("Inventory Full");
        const txt = els.inv.name.value;
        if(txt) {
            charData.inventory.push({ id: Date.now(), text: txt });
            els.inv.name.value = '';
            renderInventory();
        }
    });

    els.roll.btn.addEventListener('click', performRoll);

    [0,1,2].forEach(i => els.wishes[i].addEventListener('change', (e: Event) => charData.wishes[i] = (e.target as HTMLInputElement).value));
    els.bg.addEventListener('change', (e: Event) => charData.background = (e.target as HTMLTextAreaElement).value);

    els.btnSave.addEventListener('click', saveCharacter);
    els.loadSelect.addEventListener('change', loadCharacter);
}

// --- Rendering & Logic ---

function render() {
    const cls = CLASS_DATA[charData.class] || { maxHp: 0, maxSp: 0, combat: {}, skills: {} };
    const grow = charData.growths;

    const mHp = (cls.maxHp||0) + grow.maxHp;
    const mSp = (cls.maxSp||0) + grow.maxSp;
    els.display.maxHp.textContent = mHp.toString();
    els.display.maxSp.textContent = mSp.toString();
    charData.maxHp = mHp; charData.maxSp = mSp;

    let c = { atk: cls.combat.atkMod||0, def: cls.combat.defMod||0, spl: cls.combat.spellMod||0, aid: cls.combat.aidMod||0,
              wd: 0, md: 0, pr: 0, mr: 0 };
    Object.values(charData.equipment).forEach(e => {
        c.atk += (e.atkMod||0); c.def += (e.defMod||0); c.spl += (e.spellMod||0); c.aid += (e.aidMod||0);
        c.wd += (e.weaponDmgMod||0); c.md += (e.magicDmgMod||0); c.pr += (e.physicDmgRed||0); c.mr += (e.magicDmgRed||0);
    });

    const setC = (k: string, val: number, sub: string) => {
        document.getElementById(`val-${k}`)!.textContent = val >= 0 ? `+${val}` : `${val}`;
        document.getElementById(`sub-${k}`)!.textContent = sub;
        (charData as any)[k] = val; 
    };
    setC('atkMod', c.atk, `(C:${cls.combat.atkMod||0} E:${c.atk-(cls.combat.atkMod||0)})`);
    setC('defMod', c.def, `(C:${cls.combat.defMod||0} E:${c.def-(cls.combat.defMod||0)})`);
    setC('spellMod', c.spl, `(C:${cls.combat.spellMod||0} E:${c.spl-(cls.combat.spellMod||0)})`);
    setC('aidMod', c.aid, `(C:${cls.combat.aidMod||0} E:${c.aid-(cls.combat.aidMod||0)})`);

    document.getElementById('val-weaponDmgMod')!.textContent = c.wd >= 0 ? `+${c.wd}` : `${c.wd}`;
    document.getElementById('val-magicDmgMod')!.textContent = c.md >= 0 ? `+${c.md}` : `${c.md}`;
    document.getElementById('val-physicDmgRed')!.textContent = `${c.pr}`;
    document.getElementById('val-magicDmgRed')!.textContent = `${c.mr}`;
    charData.weaponDmgMod = c.wd; charData.magicDmgMod = c.md; charData.physicDmgRed = c.pr; charData.magicDmgRed = c.mr;

    const setS = (k: string, short: string) => {
        const base = cls.skills[k]||0;
        const g = grow.skills[k]||0;
        const m = ((charData.miscMods as any)[short] as number) || 0;
        const total = base + g + m;
        document.getElementById(`val-${k}`)!.textContent = total >= 0 ? `+${total}` : `${total}`;
        document.getElementById(`sub-${k}`)!.textContent = `(C:${base} G:${g} M:${m})`;
        (charData as any)[k] = total;
    };
    setS('stelMod', 'stel');
    setS('negoMod', 'nego');
    setS('persMod', 'pers');
    setS('knowMod', 'know');

    let h: string[] = [];
    if(grow.maxHp) h.push(`HP+${grow.maxHp}`);
    if(grow.maxSp) h.push(`SP+${grow.maxSp}`);
    Object.entries(grow.skills).forEach(([k,v]) => h.push(`${k}+${v}`));
    els.display.growthHistory.textContent = h.join(', ');
}

function renderStatus() {
    els.conditionUI.container.innerHTML = '';
    charData.active_effects.forEach((eff, idx) => {
        const span = document.createElement('span');
        span.className = `status-tag ${eff.type.toLowerCase()}`;
        span.innerHTML = `${eff.name} <span class="remove">×</span>`;
        span.querySelector('.remove')!.addEventListener('click', () => {
            charData.active_effects.splice(idx, 1);
            renderStatus();
        });
        els.conditionUI.container.appendChild(span);
    });
}

function renderInventory() {
    els.inv.list.innerHTML = '';
    charData.inventory.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center text-xs border-b border-[#eee] py-1";
        div.innerHTML = `<span>${idx+1}. ${item.text}</span><button class="text-red-500 font-bold px-2">×</button>`;
        div.querySelector('button')!.addEventListener('click', () => {
            charData.inventory.splice(idx, 1);
            renderInventory();
        });
        els.inv.list.appendChild(div);
    });
}

function performRoll() {
    const key = els.roll.select.value;
    if(!key) return;
    const mod = (charData as any)[key] || 0;
    const d1 = Math.floor(Math.random()*6)+1;
    const d2 = Math.floor(Math.random()*6)+1;
    const sum = d1+d2;
    const total = sum + mod;

    els.roll.result.innerHTML = `
        <div class="flex flex-col">
            <span class="text-2xl font-bold text-[#3E2723]">${total}</span>
            <span class="text-[10px] text-gray-500">2D6(${sum}) + ${mod}</span>
        </div>`;

    const text = `${els.roll.select.options[els.roll.select.selectedIndex].text}: 2D6(${sum}) + ${mod} = ${total}`;
    const div = document.createElement('div');
    div.className = "cursor-pointer hover:bg-gray-100 p-1 border-b border-gray-100";
    div.textContent = text;
    div.addEventListener('click', () => {
        navigator.clipboard.writeText(text);
        alert("Copied: " + text);
    });
    els.roll.history.prepend(div);
    if(els.roll.history.children.length > 5) els.roll.history.lastChild?.remove();
}

// --- Firebase Actions ---

async function saveCharacter() {
    if(!currentUser) return;
    els.appStatus.text.textContent = "Saving...";
    charData.ownerId = currentUser.uid;
    charData.lastActive = Date.now();

    if(!currentDocId) {
        // @ts-ignore
        const newRef = doc(collection(db, "characters"));
        currentDocId = newRef.id;

        // FIX 2: Assign non-null asserted id to charData
        charData.id = currentDocId!;
    }

    // @ts-ignore
    await setDoc(doc(db, "characters", currentDocId!), charData);
    els.appStatus.text.textContent = "Saved";
    loadCharacterList(); 
}

async function loadCharacterList() {
    if(!currentUser) return;
    // @ts-ignore
    const q = query(collection(db, "characters"), where("ownerId", "==", currentUser.uid), orderBy("lastActive", "desc"));
    // @ts-ignore
    const snapshot = await getDocs(q);
    els.loadSelect.innerHTML = '<option value="">Load Character...</option><option value="NEW">[ + Create New ]</option>';

    snapshot.forEach((d: any) => {
        const data = d.data();
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${data.name} (${data.class}) - ${new Date(data.lastActive).toLocaleTimeString()}`;
        els.loadSelect.appendChild(opt);
    });
}

async function loadCharacter() {
    const val = els.loadSelect.value;
    if(val === "NEW") {
        currentDocId = null;
        charData = createEmptyData();
        refreshAllFields();
    } else if(val) {
        els.appStatus.text.textContent = "Loading...";
        // @ts-ignore
        const d = await getDoc(doc(db, "characters", val));
        if(d.exists()) {
            currentDocId = d.id;
            charData = d.data() as ActivePCData;
            refreshAllFields();
            els.appStatus.text.textContent = "Loaded";
        }
    }
}

function refreshAllFields() {
    els.inputs.name.value = charData.name;
    els.inputs.age.value = charData.age;
    els.inputs.race.value = charData.race;
    els.inputs.class.value = charData.class;
    els.inputs.hp.value = charData.currentHp.toString();
    els.inputs.sp.value = charData.currentSp.toString();
    els.inputs.gold.value = charData.money.gold.toString();
    els.inputs.silver.value = charData.money.silver.toString();

    els.toolBasket.desc.value = charData.miscMods.desc;
    els.toolBasket.stel.value = charData.miscMods.stel.toString();
    els.toolBasket.nego.value = charData.miscMods.nego.toString();
    els.toolBasket.pers.value = charData.miscMods.pers.toString();
    els.toolBasket.know.value = charData.miscMods.know.toString();

    els.wishes[0].value = charData.wishes[0];
    els.wishes[1].value = charData.wishes[1];
    els.wishes[2].value = charData.wishes[2];
    els.bg.value = charData.background;

    render();
    renderStatus();
    renderInventory();

    Object.entries(charData.equipment).forEach(([slot, item]) => {
        const container = document.querySelector(`[data-slot="${slot}"][data-field="name"]`)?.closest('div')?.parentElement;
        if(container) {
            (container.querySelector(`[data-field="name"]`) as HTMLInputElement).value = item.name;
            (container.querySelector(`[data-field="effect"]`) as HTMLInputElement).value = item.effect || "";
            ['atkMod','defMod','spellMod','weaponDmgMod','magicDmgMod','physicDmgRed','magicDmgRed'].forEach(k => {
                 const inp = container.querySelector(`[data-field="${k}"]`) as HTMLInputElement;
                 if(inp) inp.value = ((item as any)[k] || 0).toString();
            });
        }
    });
}

// --- Exports ---
(window as any).exportMd = (type: string) => {
    let md = "";
    if(type === 'A' || type === 'B') {
        md += `**${charData.name}** (${charData.class}/${charData.race})\n`;
        md += `HP: ${charData.currentHp}/${charData.maxHp}  SP: ${charData.currentSp}/${charData.maxSp}\n`;
        md += `[Combat] Atk:+${charData.atkMod} Def:+${charData.defMod} Spl:+${charData.spellMod} Aid:+${charData.aidMod}\n`;
        md += `[Dmg] W:+${charData.weaponDmgMod} M:+${charData.magicDmgMod} | Cut P:${charData.physicDmgRed} M:${charData.magicDmgRed}\n`;
        md += `[Skill] Stl:+${charData.stelMod} Neg:+${charData.negoMod} Obs:+${charData.persMod} Knw:+${charData.knowMod}\n`;
    }
    if(type === 'A' || type === 'C') {
        md += `\n**Inventory** (${charData.money.gold} G ${charData.money.silver} S)\n`;
        charData.inventory.forEach(i => md += `- ${i.text}\n`);
    }
    if(type === 'A' || type === 'D') {
        md += `\n**Narrative**\n`;
        md += `Wishes: ${charData.wishes.join(' / ')}\n`;
        md += `BG: ${charData.background}\n`;
    }
    navigator.clipboard.writeText(md).then(() => alert("Copied MD!"));
};

setupUI();

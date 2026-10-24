const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

test('mobile edit form keeps save/cancel labels and distinct history actions',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../main-2321.js'),'utf8');
  const start=source.indexOf('function decorateMobileActionIcons');
  const end=source.indexOf("window.addEventListener('resize',()=>requestAnimationFrame(()=>decorateMobileActionIcons",start);
  assert.ok(start>=0&&end>start);
  const dom=new JSDOM('<div id="actions"><button>Simpan Data Hari Ini</button><button>Batal Edit</button><button>Batal Koreksi</button><button>Edit</button><button>Hapus</button></div>',{runScripts:'outside-only'});
  try{
    let mobile=true;
    dom.window.matchMedia=()=>({matches:mobile});
    dom.window.eval(source.slice(start,end));
    const root=dom.window.document.querySelector('#actions');
    const labels=()=>[...root.children].map(b=>b.textContent);
    dom.window.decorateMobileActionIcons(root);
    root.children[0].textContent='Simpan Perubahan';
    dom.window.decorateMobileActionIcons(root);
    dom.window.decorateMobileActionIcons(root);
    assert.deepEqual(labels(),['Simpan Perubahan','Batal Edit','Batal Koreksi','✏️','🗑️']);
    for(const button of [...root.children].slice(0,3))assert.equal(button.classList.contains('mobile-icon-action'),false);
    assert.equal(root.children[3].getAttribute('aria-label'),'Edit');
    assert.equal(root.children[4].getAttribute('aria-label'),'Hapus');
    mobile=false;
    dom.window.decorateMobileActionIcons(root);
    assert.deepEqual(labels(),['Simpan Perubahan','Batal Edit','Batal Koreksi','Edit','Hapus']);
  }finally{dom.window.close()}
});

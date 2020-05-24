class Item {
    constructor(name, url_name, image){
        this.name = name;
        this.url_name = url_name;
        this.image = 'https://warframe.market/static/assets/' + image;
        this.relics = new Map();
        this.price = 0;
    }
}

class Rarity{
    constructor(name){
        this.name = name;
        if(this.name == 'Uncommon'){
            this.raffinage = new Map([['Intact', 11],['Exceptional', 13],['Flawless', 17],['Radiant', 20]]);
        }else if(this.name == 'Rare'){
            this.raffinage = new Map([['Intact', 2],['Exceptional', 4],['Flawless', 6],['Radiant', 10]]);
        }else{
            this.raffinage = new Map([['Intact', 25.33],['Exceptional', 23.33],['Flawless', 20],['Radiant', 16.67]]);
            this.name = 'Common';
        }
    }
}

class Relic {
    constructor(ere, name){
        this.ere = ere;
        this.name = name;
        this.loot = new Map();
        this.vaulted = false;
    }

    get averagePrice(){
        let total = 0;
        this.loot.forEach((value, key, map) => {
            total += key.price * value.raffinage.get('Intact');
        });
        return total/100;
    }

    get fullName(){
        return this.ere + ' ' + this.name;
    }

}

let items = [];
let relics = [];
let vaultedRelicsName = [];

let modal;
let closeModal;
let modalContent;
let tableItems;
let tableRelics;
let searchItems;
let butRefresh;
let checkboxVaulted;
let checkboxSet;

main = () => {
    tableItems = document.getElementById('tableItems');
    tableRelics = document.getElementById('tableRelics');
    searchItems = document.getElementById('searchItems');
    butRefresh = document.getElementById('butRefresh');
    modal = document.getElementById("myModal");
    closeModal = document.getElementById('closeModal');
    modalContent = document.getElementById('modal-content');
    checkboxVaulted = document.getElementById('checkboxVaulted');
    checkboxSet = document.getElementById('checkboxSet');

    loadData();

    searchItems.addEventListener('input', () => {
        refreshDisplay();
    });

    checkboxVaulted.addEventListener('change', () => {
        refreshDisplay();
    });

    checkboxSet.addEventListener('change', () => {
        refreshDisplay();
    });

    butRefresh.addEventListener('click', () => {
        refreshPrice();
    });

    closeModal.onclick = () => {
        removeModal();
    };

    console.log(items);
}

window.onclick = function(event) {
    if (event.target == modal) {
      removeModal();
    }
  }

window.onload = main;

function sortByPrice(list){
    return list.sort((a, b) => {
        if(a.price < b.price){
            return 1;
        }
        if(a.price > b.price){
            return -1;
        }
        return 0;
    });
}

function sortByAveragePrice(list){
    return list.sort((a, b) => {
        if(a.averagePrice < b.averagePrice){
            return 1;
        }
        if(a.averagePrice > b.averagePrice){
            return -1;
        }
        return 0;
    });
}

function filterByName(list, filtre){
    return list.filter(it => it.name.toLowerCase().includes(filtre.toLowerCase()));
}

function filterByRelicName(list, filtre){
    return list.filter(it => it.fullName.toLowerCase().includes(filtre.toLowerCase()));
}

function filterRelicByVaulted(list){
    if(!checkboxVaulted.checked)
        return list.filter(rel => !rel.vaulted)
    return list;
}

function filterBySet(list){
    if(!checkboxSet.checked)
        return list.filter(el => !el.name.toLowerCase().includes('prime set'));
    return list;
}

function fillTable(table, list){
    list.forEach(el => {
        let row = table.insertRow();
        let image = document.createElement('img');
        image.src = el.image;
        image.width = 32;
        image.height = 32;
        row.insertCell().appendChild(image);
        row.insertCell().appendChild(document.createTextNode(el.name));
        row.insertCell().appendChild(document.createTextNode(el.price));
        row.addEventListener('click', () => {
            el.relics.forEach((value, key, map) => {
                let text = document.createElement('p');
                if(relics.find(rel => rel.fullName == key).vaulted){
                    text.style.backgroundColor = 'lightcoral';
                }else{
                    text.style.backgroundColor = 'lightgreen';
                }
                text.innerText = key + ' ' + value.name;
                modalContent.appendChild(text);
            })
            modal.style.display = 'block';
        });
    });
}

function fillWithRelics(table, list){
    // À remplir
    list.forEach((el) => {
        let row = table.insertRow();
        let cellName = row.insertCell().appendChild(document.createTextNode(el.fullName));
        let cellPrice = row.insertCell().appendChild(document.createTextNode(el.averagePrice.toFixed(1)));
        if(el.vaulted){
            row.style.backgroundColor = 'lightcoral';
        }else{
            row.style.backgroundColor = 'lightgreen';
        }
        row.addEventListener('click', () => {
            el.loot.forEach((value, key, map) => {
                let text = document.createElement('p');
                text.innerText = value.name + ' ' + key.name + ' ' + key.price + 'pl';
                modalContent.appendChild(text);
            });
            modal.style.display = 'block';
        });
    });
}

function applyFilter(){
    let res = sortByPrice(items);
    res = filterByName(res, searchItems.value);
    res = filterBySet(res);
    return res;
}

function applyRelicFilter(){
    let res = sortByAveragePrice(relics);
    res = filterByRelicName(res, searchItems.value);
    res = filterRelicByVaulted(res);
    return res;
}

function removeModal(){
    modal.style.display = 'none';
    modalContent.innerText = '';
}

function refreshPrice(){
    butRefresh.disabled = true;
    let requests = items.map(it => fetch('http://api.warframe.market/v1/items/' + it.url_name + '/orders'));
    return Promise.all(requests)
        .then(res => Promise.all(res.map(r => r.json())))
        .then(jsons => {
            for(let i = 0; i < items.length; i++){
                let orders = jsons[i]['payload']['orders'];
                let minPrice = null;
                orders.forEach((or) => {
                    if(or.platform == 'pc' && or.order_type == 'sell' && or.visible && or.user.status == 'ingame'){
                        if(minPrice == null){
                            minPrice = or.platinum;
                        }else if(or.platinum < minPrice){
                            minPrice = or.platinum;
                        }
                    }
                });
                items[i].price = minPrice;
            }

            let newBody = document.createElement('tbody');
            fillTable(newBody, applyFilter());
            tableItems.parentNode.replaceChild(newBody, tableItems);
            tableItems = newBody;

            searchItems.disabled = false;
            butRefresh.disabled = false;
            checkboxSet.disabled = false;
        });
}

function refreshDisplay(){
    let newBody = document.createElement('tbody');
    fillTable(newBody, applyFilter());
    tableItems.parentNode.replaceChild(newBody, tableItems);
    tableItems = newBody;

    let newBody2 = document.createElement('tbody');
    fillWithRelics(newBody2, applyRelicFilter());
    tableRelics.parentNode.replaceChild(newBody2, tableRelics);
    tableRelics = newBody2;
}

function checkIfVaulted(){
    fetch('https://warframe.fandom.com/wiki/Void_Relic')
    .then(r => r.text())
    .then(text => {
        let parser = new DOMParser();
        let doc = parser.parseFromString(text, 'text/html');
        let divVaulted = doc.getElementById('mw-customcollapsible-VaultedRelicList');
        let spanVaulted = divVaulted.getElementsByClassName('relic-tooltip');
        for(let i = 0; i < spanVaulted.length; i++){
            if(relics.filter(rel => rel.fullName == spanVaulted[i].firstChild.innerText).length >= 1){
                relics[relics.findIndex(rel => rel.fullName == spanVaulted[i].firstChild.innerText)].vaulted = true;
            }
        }
        relics[relics.findIndex(rel => rel.fullName == 'Neo O1')].vaulted = true;
        relics[relics.findIndex(rel => rel.fullName == 'Axi V8')].vaulted = true;
        refreshDisplay();
        checkboxVaulted.disabled = false;
    })
}

function loadData(){
    fetch('http://api.warframe.market/v1/items')
        .then(r => r.json())
        .then((json) => {
            allItems = json['payload']['items'];
            if(allItems.length != 0){
                allItems.forEach((el) => {
                    if(el.item_name.toLowerCase().includes(' prime ')){
                        let it = new Item(el.item_name, el.url_name, el.thumb);
                        items.push(it);
                    }
                })
            }
            refreshPrice()
                .then(() => {
                    fetch('https://drops.warframestat.us/data/relics.json')
                    .then(r => r.json())
                    .then(json => {
                        let allRelics = json['relics'];
                        allRelics.forEach((el) => {
                            if(el.state == 'Intact'){
                                let rel = new Relic(el.tier, el.relicName);
                                el.rewards.forEach((re) => {
                                    let compString = re.itemName;
                                    if(re.itemName.toLowerCase().includes('systems') || re.itemName.toLowerCase().includes('chassis') || re.itemName.toLowerCase().includes('neuroptics') || re.itemName.toLowerCase().includes('harness') || re.itemName.toLowerCase().includes('wings')){
                                        if(compString.substring(re.itemName.length - 10).toLowerCase() == ' blueprint')
                                            compString = re.itemName.substring(0, re.itemName.length - 10);
                                    }
                                    if(compString.toLowerCase().includes('prime') && !compString.toLowerCase().includes('kavasa')){
                                        let item = items.find(i => i.name.toLowerCase() == compString.toLowerCase());
                                        let rarity = 'Common';
                                        if(re.chance == 11){
                                            rarity = 'Uncommon';
                                        }else if(re.chance == 2){
                                            rarity = 'Rare';
                                        }
                                        item.relics.set(rel.ere + ' ' + rel.name, new Rarity(rarity));
                                        rel.loot.set(item, new Rarity(rarity));
                                    }
                                });
                                relics.push(rel);
                                // Ajouter les items à la liste des loot
                            }
                        });

                        let newBody = document.createElement('tbody');
                        fillWithRelics(newBody, applyRelicFilter());
                        tableRelics.parentNode.replaceChild(newBody, tableRelics);
                        tableRelics = newBody;
                        
                        checkIfVaulted();

                    });
                });
            
        })
        .catch((err) => {
            console.error(err);
        });
}
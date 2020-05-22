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
        }else if(this.name = 'Rare'){
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

let modal;
let closeModal;
let modalContent;
let tableItems;
let tableRelics;
let searchItems;
let butRefresh;

main = () => {
    tableItems = document.getElementById('tableItems');
    tableRelics = document.getElementById('tableRelics');
    searchItems = document.getElementById('searchItems');
    butRefresh = document.getElementById('butRefresh');
    modal = document.getElementById("myModal");
    closeModal = document.getElementById('closeModal');
    modalContent = document.getElementById('modal-content');

    loadData();

    searchItems.addEventListener('input', () => {
        let newBody = document.createElement('tbody');
        fillTable(newBody, filterByName(sortByPrice(items), searchItems.value));
        tableItems.parentNode.replaceChild(newBody, tableItems);
        tableItems = newBody;
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
        row.insertCell();
        row.insertCell().appendChild(document.createTextNode(el.fullName));
        row.insertCell().appendChild(document.createTextNode(el.averagePrice.toFixed(1)));
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
                    if(or.platform == 'pc' && or.order_type == 'sell'){
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
            fillTable(newBody, filterByName(sortByPrice(items), searchItems.value));
            tableItems.parentNode.replaceChild(newBody, tableItems);
            tableItems = newBody;

            searchItems.disabled = false;
            butRefresh.disabled = false;
            
        });
}

function loadData(){
    fetch('http://api.warframe.market/v1/items')
        .then(r => r.json())
        .then((json) => {
            allItems = json['payload']['items'];
            if(allItems.length != 0){
                allItems.forEach((el) => {
                    if(el.item_name.toLowerCase().includes(' prime ') && !el.item_name.toLowerCase().includes('prime set')){
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
                        fillWithRelics(newBody, filterByRelicName(sortByAveragePrice(relics), ''));
                        tableRelics.parentNode.replaceChild(newBody, tableRelics);
                        tableRelics = newBody;

                    });
                });
                console.log(items);
                console.log(relics);
            
        })
        .catch((err) => {
            console.error(err);
        });
}
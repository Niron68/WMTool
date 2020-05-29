class Item {
    constructor(name, url_name, image, id){
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

class Order{
    constructor(type, item, platinum){
        this.type = type;
        this.item = item;
        this.platinum = platinum;
    }
}

class User{
    constructor(token, name){
        this.token = token;
        this.name = name;
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
        let res = [];
        let bestName;
        let best = 0;
        let raffinage = ['Intact', 'Exceptional', 'Flawless', 'Radiant'];
        raffinage.forEach((raf) => {
            let total = 0;
            this.loot.forEach((value, key, map) => {
                total += key.price * value.raffinage.get(raf);
            });
            res.push(total/100);
            if((total/100) > best + 0.00001){
                best = (total/100);
                bestName = raf;
            }
        });
        return { Intact: res[0], Exceptional: res[1], Flawless: res[2], Radiant: res[3], Best: best, BestName: bestName};
    }

    get fullName(){
        return this.ere + ' ' + this.name;
    }

}

let items = [];
let relics = [];
let orders = [];
let user = null;

$(() => {

    loadData();

    $('#refresh').click(() => {
        $('.list-group').append('<li class="list-group-item">New Items</li>');
    });

    $('#searchBar').on('input', () => {
        refreshDisplay();
    });

    $('.refresh').on('change', () => {
        refreshDisplay();
    });

});

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
        if(a.averagePrice[$('#refining').val()] < b.averagePrice[$('#refining').val()]){
            return 1;
        }
        if(a.averagePrice[$('#refining').val()] > b.averagePrice[$('#refining').val()]){
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
    if(!$('displayVault').prop('checked'))
        return list.filter(rel => !rel.vaulted)
    return list;
}

function filterBySet(list){
    if(!$('#displaySet').prop('checked'))
        return list.filter(el => !el.name.toLowerCase().includes('prime set'));
    return list;
}

function applyFilter(){
    let res = sortByPrice(items);
    res = filterByName(res, $('#searchBar').val());
    res = filterBySet(res);
    return res;
}

function applyRelicFilter(){
    let res = sortByAveragePrice(relics);
    res = filterByRelicName(res, $('#searchBar').val());
    res = filterRelicByVaulted(res);
    return res;
}

function actualiseListItem(){
    $('ul#items').empty();
    $('ul#items').append('<li class="list-group-item bg-info text-light font-weight-bold">Items</li>');
    let list = applyFilter();
    list.forEach((it) => {
        $('ul#items').append('<li class="list-group-item font-weight-bold"><img src="' + it.image + '" width="32" height="32"> ' + it.name + '       ' + it.price + '</li>');
    });
}

function actualiseListRelic(){
    $('ul#relics').empty();
    $('ul#relics').append('<li class="list-group-item bg-info text-light font-weight-bold">Relics</li>');
    let list = applyRelicFilter();
    list.forEach((it) => {
        $('ul#relics').append('<li class="list-group-item font-weight-bold">' + it.fullName + '   ' + it.averagePrice['Intact'].toFixed(1) + '</li>');
    });
}

function refreshDisplay(){
    actualiseListItem();
    actualiseListRelic();
}

function refreshPrice(){
    $('#refresh').prop('disabled', true);
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

            actualiseListItem();

            // searchItems.disabled = false;
            $('#refresh').prop('disabled', false);
            // checkboxSet.disabled = false;
        });
}

function loadData(){
    fetch('http://api.warframe.market/v1/items')
        .then(r => r.json())
        .then((json) => {
            let allItems = json['payload']['items'];
            if(allItems.length != 0){
                allItems.forEach((el) => {
                    if(el.item_name.toLowerCase().includes(' prime ')){
                        let it = new Item(el.item_name, el.url_name, el.thumb, el.id);
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

                        actualiseListRelic();
                        
                        // checkIfVaulted();

                    });
                });
            
        })
        .catch((err) => {
            console.error(err);
        });
}
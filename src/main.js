const LineAPI = require('./api');
const { Message, OpType, Location } = require('../curve-thrift/line_types');
let exec = require('child_process').exec;

const myBot = ['u7a92b4c0c87a2dfeedec343276cea972','uf51ed4f092b7686f297a23ed3789ae34','u5373e15ec8d7c4e3983098440b62587a','u73095ed1d4406202ddf2d26618a05cac','uf71b8e10ca3e778d2b409b072cb0597f','u8df2040f34fed7425e9b263ea1dbfe9b','u7a8804ae9c54c18dfd2000351c429b86','u4037c6b6ab3aeb47010fd464b227e603'];
// -tips biar botnya gk error mulu-
// ubah authtoken + certificate di src/bot.js


function isAdminOrBot(param) {
    return myBot.includes(param);
}

function firstToUpperCase(str) {
    return str.substr(0, 1).toUpperCase() + str.substr(1);
}

class LINE extends LineAPI {
    constructor() {
        super();
        this.receiverID = '';
        this.checkReader = [];
        this.creator = [];
        this.stateStatus = {      
            qr: 0,
            kick: 0,   
           // cancel: 0,
            reinvite: 0,
            protection: 0,
        }
    }

    getOprationType(operations) {
        for (let key in OpType) {
            if(operations.type == OpType[key]) {
                if(key !== 'NOTIFIED_UPDATE_PROFILE') {
                    console.info(`[* ${operations.type} ] ${key} `);
                }
            }
        }
    }

    poll(operation) {
        if(operation.type == 25 || operation.type == 26) {
            // console.log(operation);
            const txt = (operation.message.text !== '' && operation.message.text != null ) ? operation.message.text : '' ;
            let message = new Message(operation.message);
            this.receiverID = message.to = (operation.message.to === myBot[0]) ? operation.message.from_ : operation.message.to ;
            Object.assign(message,{ ct: operation.createdTime.toString() });
            this.textMessage(txt,message);
        }
     
        if(operation.type == 19) { //ada kick
            // op1 = group nya
            // op2 = yang 'nge' kick
            // op3 = yang 'di' kick
            if(isAdminOrBot(operation.param3)) {
                this._inviteIntoGroup(operation.param1,[operation.param3]);
            }
            if(!isAdminOrBot(operation.param2)) {
                this._kickMember(operation.param1,[operation.param2]);
            }

         }
   
         if(operation.type == 17 && this.stateStatus.kick == 1) { //notif accept group invitation
             if(!isAdminOrBot(operation.param2)) {
                 this._kickMember(operation.param1,[operation.param2]);
             }
         }
      
         if(operation.type == 19) { //auoto reinvite
             if(isAdminOrBot(operation.param2)) {
                this._inviteIntoGroup(operation.param1,[operation.param2]);
             }
         }
           
         if(operation.type == 32 && this.stateStatus.protection ==1) { //notif cancel invite
             // op1 = group nya
             // op2 = yang 'nge' cancel
             if(!isAdminOrBot(operation.param2)) {
                 this._kickMember(operation.param1,[operation.param2]);
             }
         }
         
         if(operation.type == 13 && this.stateStatus.protection == 1) { //notif invite
             if(!isAdminOrBot(operation.param2)) {
              this._kickMember(operation.param1,[operation.param2]);
             }
         }
      
         if(operation.type == 11 && this.stateStatus.protection == 1) { // url
             // op1 = group nya
             // op2 = yang 'open/close' url
             if(!isAdminOrBot(operation.param2)) {
                 this._kickMember(operation.param1,[operation.param2]);
             }
         }
      
         if(operation.type == 13 && this.stateStatus.protection == 1) { //notif invite
             if(!isAdminOrBot(operation.param2)) {
             this.cancel(operation.param1,[operation.param2]);
             }
         }
      
         if(operation.type == 15 && this.stateStatus.reinvite == 1) { //Ada Leave
             // op1 = groupnya
             // op2 = yang 'telah' leave
         if(isAdminOrBot(operation.param2)); {
            this._inviteIntoGroup(operation.param1,[operation.param2]);
            }
         }
      
         if(operation.type == 55){ //ada reader

            const idx = this.checkReader.findIndex((v) => {
                if(v.group == operation.param1) {
                    return v
                }
            })
            if(this.checkReader.length < 1 || idx == -1) {
                this.checkReader.push({ group: operation.param1, users: [operation.param2], timeSeen: [operation.param3] });
            } else {
                for (var i = 0; i < this.checkReader.length; i++) {
                    if(this.checkReader[i].group == operation.param1) {
                        if(!this.checkReader[i].users.includes(operation.param2)) {
                            this.checkReader[i].users.push(operation.param2);
                            this.checkReader[i].timeSeen.push(operation.param3);
                        }
                    }
                }
            }
        }
      
        if(operation.type == 13) { // diinvite
            if(isAdminOrBot(operation.param2)) {
                return this._acceptGroupInvitation(operation.param1);
            } else {
                return this._cancel(operation.param1,myBot);
            }
        }
        this.getOprationType(operation);
    }
     
    async cancelAll(gid) {
        let { listPendingInvite } = await this.searchGroup(gid);
        if(listPendingInvite.length > 0){
            this._cancel(gid,listPendingInvite);
        }
    }

    async searchGroup(gid) {
        let listPendingInvite = [];
        let thisgroup = await this._getGroups([gid]);
        if(thisgroup[0].invitee !== null) {
            listPendingInvite = thisgroup[0].invitee.map((key) => {
                return key.mid;
            });
        }
        let listMember = thisgroup[0].members.map((key) => {
            return { mid: key.mid, dn: key.displayName };
        });

        return { 
            listMember,
            listPendingInvite
        }
    }
  
    setState(seq) {
		if(seq == 1){
			let isinya = "== ☆ Setting ☆ ==\n";
			for (var k in this.stateStatus){
                if (typeof this.stateStatus[k] !== 'function') {
					if(this.stateStatus[k]==1){
						isinya += " "+firstToUpperCase(k)+" ▶ on\n";
					}else{
						isinya += " "+firstToUpperCase(k)+" ▶ off\n";
					}
                }
            }this._sendMessage(seq,isinya);
		}else{
        if(isAdminOrBot(seq.from)){
            let [ actions , status ] = seq.text.split(' ');
            const action = actions.toLowerCase();
            const state = status.toLowerCase() == 'on' ? 1 : 0;
            this.stateStatus[action] = state;
			let isinya = "== ☆ Setting ☆ ==\n";
			for (var k in this.stateStatus){
                if (typeof this.stateStatus[k] !== 'function') {
					if(this.stateStatus[k]==1){
						isinya += " "+firstToUpperCase(k)+" ▶ on\n";
					}else{
						isinya += " "+firstToUpperCase(k)+" ▶ off\n";
					}
                }
            }
            //this._sendMessage(seq,`Status: \n${JSON.stringify(this.stateStatus)}`);
			this._sendMessage(seq,isinya);
        } //else {
           // this._sendMessage(seq,`Hanya akses admin`);
        }//}
    }

    mention(listMember) {
        let mentionStrings = [''];
        let mid = [''];
        for (var i = 0; i < listMember.length; i++) {
            mentionStrings.push('@'+listMember[i].displayName+'\n');
            mid.push(listMember[i].mid);
        }
        let strings = mentionStrings.join('');
        let member = strings.split('@').slice(1);
        
        let tmp = 0;
        let memberStart = [];
        let mentionMember = member.map((v,k) => {
            let z = tmp += v.length + 1;
            let end = z - 1;
            memberStart.push(end);
            let mentionz = `{"S":"${(isNaN(memberStart[k - 1] + 1) ? 0 : memberStart[k - 1] + 1 ) }","E":"${end}","M":"${mid[k + 1]}"}`;
            return mentionz;
        })
        return {
            names: mentionStrings.slice(1),
            cmddata: { MENTION: `{"MENTIONEES":[${mentionMember}]}` }
        }
    }

    async leftGroupByName(payload) {
        let gid = await this._findGroupByName(payload);
        for (var i = 0; i < gid.length; i++) {
            this._leaveGroup(gid[i]);
        }
    }
  
    async check(cs,group) {
        let users;
        for (var i = 0; i < cs.length; i++) {
            if(cs[i].group == group) {
                users = cs[i].users;
            }
        }
        
        let contactMember = await this._getContacts(users);
        return contactMember.map((z) => {
                return { displayName: z.displayName, mid: z.mid };
            });
    }

    removeReaderByGroup(groupID) {
        const groupIndex = this.checkReader.findIndex(v => {
            if(v.group == groupID) {
                return v
            }
        })

        if(groupIndex != -1) {
            this.checkReader.splice(groupIndex,1);
        }
    }
   
    async textMessage(textMessages, seq) {
        let [ cmd, ...payload ] = textMessages.split(' ');
        payload = payload.join(' ');
        let txt = textMessages.toLowerCase();
        let messageID = seq.id;
   
        var group = await this._getGroup(seq.to);
  
        if(txt == 'rn' && isAdminOrBot(seq.from)) {
            this._sendMessage(seq, 'Ready');
        }    
	    
        if(txt == 'sp' && isAdminOrBot(seq.from)) {
            const curTime = (Date.now() / 9000);
          //  await this._sendMessage(seq,'Read Time');
            const rtime = (Date.now() / 9000) - curTime;
            await this._sendMessage(seq, `${rtime} second`);
        }
      
        if(txt === 'salken' || txt === 'kickall' && this.stateStatus.kick == 1 && isAdminOrBot(seq.from)) {
            let { listMember } = await this.searchGroup(seq.to);
            for (var i = 0; i < listMember.length; i++) {
                if(!isAdminOrBot(listMember[i].mid)){
                    this._kickMember(seq.to,[listMember[i].mid]);
                }
            }
        }
    
        const action = ['cancel on','cancel off','kick on','kick off','protection on','protection off','qr on','qr off']
        if(action.includes(txt)) {
            this.setState(seq);
        }
          
        if(cmd == 'kill' && isAdminOrBot(seq.from)){
           let target = payload.replace('@','');
           let group = await this._getGroups([seq.to]);
           let gm = group[0].members;
              for(var i = 0; i < gm.length; i++){
                     if(gm[i].displayName == target){
                                  target = gm[i].mid;
                     }
               }
               this._kickMember(seq.to,[target]);
        }

        if(cmd == 'join' || cmd == 'Join') { //untuk join group pake qrcode contoh: join line://anu/g/anu
            const [ ticketId ] = payload.split('g/').splice(-1);
            let { id } = await this._findGroupByTicket(ticketId);
            await this._acceptGroupInvitationByTicket(id,ticketId);
        }

        if(cmd == 'spam' || cmd == 'S:spam' && isAdminOrBot(seq.from)) {
            for(var i = 0; i < 100;  i++) {
                this._sendMessage(seq,'Boda Amat Gua Gak Liat😅');
            }
        }
      
        if(cmd == 'bc'&& isAdminOrBot(seq.from)) {
            const [  j, kata ] = payload.split(':');
            for (var i=0; i <j; i++) {
            this._sendMessage(seq,`${kata}`);
            }
        }
      
        if(txt == 'bye all' && isAdminOrBot(seq.from)) {
          this._leaveGroup(seq.to);
        }
      
    }

}

module.exports = new LINE();

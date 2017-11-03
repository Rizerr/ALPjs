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
      
         /*if(operation.type == 25 || operation.type == 26) {
                this._client.removeAllMessages(operation.param1);
         }*/
      
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
 
    //setState(seq) {
   //     if(isAdminOrBot(seq.from)){
      //      let [ actions , status ] = seq.text.split(' ');
      //      const action = actions.toLowerCase();
      //      const state = status.toLowerCase() == 'on' ? 1 : 0;
      //      this.stateStatus[action] = state;
     //       this._sendMessage(seq,`Status: \n${JSON.stringify(this.stateStatus)}`);
  //      } else {
   //         this._sendMessage(seq, `Lu bukan admin bego 😂`);
  //        }
 //   }

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
    
      /*  var date = new Date();

        var bulanku = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        var hariku = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jum&#39;at', 'Sabtu'];
        var tanggal = date.getDate();
        var bulan = date.getMonth(),
            bulan = bulanku[bulan];
        var hariIni = date.getDay(),
            hariIni = hariku[hariIni];
        var tahun = date.getFullYear();

        if(txt == 'dat' || txt == 'date and time' && isAdminOrBot(seq.from)) {
            let menit = ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48','49','50','51','52','53','54','55','56','57','58','59','00'];
            let jam = ['11','12','13','14','15','16','17','18','19','20','21','23','00','01','02','03','04','05','06','07','08','09','10','11'];
            let hh = jam[date.getHours()];
            let mm = menit[date.getMinutes()];
            let ss = menit[date.getSeconds()];
            this._sendMessage(seq, `🔘 Pukul, ${hh} : ${mm} : ${ss} WIB\n\n🔘 ${hariIni}, ${tanggal} ${bulan} ${tahun}`);
        }
      
      
        var group = await this._getGroup(seq.to);
      
        if(txt == 'gcreator') {
            let creator = group.creator.mid;
            seq.contentType=13;
            seq.contentMetadata = { mid: `${creator}` };
            this._client.sendMessage(1, seq);
        }
        
        var  group = await this._getGroup(seq.to);
    
        if(txt == 'ginfo') {
            let name = group.name;
            let id = group.id;
            let creator = group.creator.displayName;
            let members = group.members.length;
            this._sendMessage(seq, `🔘Nama Group :\n   ${name}\n\n🔘ID Group :\n   ${id}\n\n🔘Creator Group :\n   ${creator}\n\n🔘Jumlah Member :\n    ${members}`);
        }*/
      
        var protect_qr=await this._getGroup(seq.to);
      
        if(protect_qr.preventJoinByTicket==false && this.stateStatus.qr == 1 &&!isAdminOrBot(seq.from)) {
         //   this._sendMessage(seq, 'Hayoo Mau Ngapain? 😛');
            protect_qr.preventJoinByTicket=true;
            await this._updateGroup(protect_qr);
            this.client.sendMessage(0, seq)
        }
                         
       /* if(cmd == 'cancel') {
            if(payload == 'group') {
                let groupid = await this._getGroupsInvited();
                for (let i = 0; i < groupid.length; i++) {
                    this._rejectGroupInvitation(groupid[i]);                    
                }
                return;
            }
          
            if(this.stateStatu.cancel == 1) {
                this.cancelAll(seq.to);
            }
        }
                 
        /*if(txt == 'creator') {
            seq.contentType=13;
            seq.contenPreview= null,
            seq.contentMetadata = { mid: seq.from };
            this._client.sendMessage(1, seq);
        }
      
        if(txt == 'r') {
            this._sendMessage(seq, 'Siap Bosq 👮');
        }
      
       /* if(txt == 'status' || txt == 's:status' && isAdminOrBot(seq.from)) {
            this._sendMessage(seq,`<==== ☆ Status ☆ ====> \n${JSON.stringify(this.stateStatus)}`);
        }*/
      
        if(txt == 'rn' || txt == 'responsename' && isAdminOrBot(seq.from)) {
            this._sendMessage(seq, 'Şапjі');
        }

      /*	if(txt == 'help') {
	          this._sendMessage(seq, '[ All Members ]\n¤ rn [responsename]\n¤ creator\n¤ myid\n¤ sp [speed]\n¤ set [setpoint]\n¤ read\n¤ reset\n¤ /ourl | /curl\n¤ gift c\n¤ ginfo\n¤ gcreator\n¤ join <linkgroup>\n¤ dat [date and time]');//\n☆ [ Only The Owner ] ☆\n▫ status\n▫ protection on/off\n▫ kickall\n▫ kill @\n▫ cancel\n▫ tagall\n▫ spam\n▫bc [j/kata]▫ bye all\n\n  န[Admin : Rіzəя]န');
      	}
      
        if(txt == 'cm' && isAdminOrBot(seq.from)) {
	          this._sendMessage(seq, '☆ [ Only The Owner ] ☆\n=======\nS:command\n=======\n▫ status\n▫ protection on/off\n▫ kickall\n▫ kill @\n▫ cancel\n▫ tagall\n▫ spam\n▫ bc [j/kata]\n▫ bye all\n\n      န[Admin : Rіzəя]န');
      	}
      
        /*if(txt == 'gift c' || txt == 'gift all') {
            seq.contentType = 9
            seq.contentMetadata = {'PRDID': 'a9ed993f-a4d8-429d-abc0-2692a319afde','PRDTYPE': 'THEME','MSGTPL': '8'};
            this._client.sendMessage(1, seq);
        }*/
       
       
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
    
      /*  if(txt == 'setpoint' || txt == 'set') {
            this._sendMessage(seq, `Read point telah di set!`);
            this.removeReaderByGroup(seq.to);
        }

        if(txt == 'reset') {
            this.checkReader = []
            this._sendMessage(seq, `Read point telah di reset!`);
        }
          
        if(txt == 'read') {
            let rec = await this.check(this.checkReader,seq.to);
            const mentions = await this.mention(rec);
            seq.contentMetadata = mentions.cmddata;
            await this._sendMessage(seq,mentions.names.join(''));
        }*/

        const action = ['cancel on','cancel off','kick on','kick off','protection on','protection off','qr on','qr off']
        if(action.includes(txt)) {
            this.setState(seq);
        }
          
       /* if(txt == 'myid') {
            this._sendMessage(seq,`Your ID: ${seq.from}`);
        }*/

        const joinByUrl = ['ourl','curl'];
        if(joinByUrl.includes(txt)) {
          //  this._sendMessage(seq,`Updating group ...`);
            let updateGroup = await this._getGroup(seq.to);
            updateGroup.preventJoinByTicket = true;
            if(txt == 'ourl' && isAdminOrBot(seq.from)) {
                updateGroup.preventJoinByTicket = false;
                const groupUrl = await this._reissueGroupTicket(seq.to);
                this._sendMessage(seq,`Link group = http://line.me/R/ti/g/${groupUrl}`);
            }
            await this._updateGroup(updateGroup);
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

      /*  if(cmd == 'spm' && isAdminOrBot(seq.from)) { // untuk spam invite contoh: spm <mid>
            for (var i = 0; i < 4; i++) {
	             await this._getAllContactIds();
                   this._createGroup(4,'SPAM',seq.to);
            }
        }*/

        if(cmd == 'spam' || cmd == 'S:spam' && isAdminOrBot(seq.from)) {
            for(var i = 0; i < 100;  i++) {
                this._sendMessage(seq,'Boda Amat Gua Gak Liat😅');
            }
        }
      
      /*  if(txt == 'tagall' && isAdminOrBot(seq.from)) {
            let rec = await this._getGroup(seq.to);
            const mentions = await this.mention(rec.members);
            seq.contentMetadata = mentions.cmddata;
            await this._sendMessage(seq,mentions.names.join(''));
        }*/
      
        if(cmd == 'bc' || cmd == 'S:bc' && isAdminOrBot(seq.from)) {
            const [  j, kata ] = payload.split(':');
            for (var i=0; i <j; i++) {
            this._sendMessage(seq,`${kata}`);
            }
        }
      
        if(txt == 'bye all' && isAdminOrBot(seq.from)) {
        //  let name = group.name;
         // let txt = await this._sendMessage(seq, `GOOD BYE ${name}`);
          this._leaveGroup(seq.to);
        }
      
    }

}

module.exports = new LINE();

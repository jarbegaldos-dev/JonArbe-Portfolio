(function (root) {
  "use strict";

  // Authoritative, incremental economic state machine. Browser and CLI call
  // these exact transitions. Presentation consumes plans; it never selects money.
  function create(o) {
    var cfg=o.config, symbols=o.symbols, rng=o.rng;
    var layout=o.layout.RIB_LAYOUT.concat([o.layout.STERNUM_LAYOUT]);
    var reels=layout.map(function(r,i){return {id:r.id,index:i,type:r.id==="sternum"?"sternum":"rib",
      cellStep:r.cellStep,scrollSign:r.scrollSign,cells:r.cells.map(function(c,k){return Object.assign({},c,{reelCellIndex:k});}),
      finalSymbols:[],giantSymbol:null,locked:false,lockedSymbol:null};});
    var byId={};reels.forEach(function(r){byId[r.id]=r;});
    var state={reels:reels,currentSpinId:null,bonusModeActive:false};
    var spinType="BASE", inline=false;
    var outcome=root.OssuaryOutcomeEngine.create({state:state,rng:rng,stripConfig:o.stripConfig,
      finiteStrips:o.finiteStrips,config:Object.assign({},symbols,{SPIN_SYMBOLS:(symbols.SPIN_SYMBOLS||symbols.WEIGHTED_NORMAL_SYMBOLS.concat("WILD")),
        RIB_BONUS_REELS:new Set(symbols.RIB_BONUS_REELS),RIBCAGE_BUILD_BONUS_RIB_WEIGHT:symbols.RIBCAGE_BUILD_BONUS_RIB_WEIGHT_REAL}),
      hooks:{getSpinType:function(){return inline?"BONUS":spinType;}}});
    var lines=root.OssuaryLineEconomy.create({symbols:o.paytable.symbols,normalSymbols:symbols.NORMAL_SYMBOLS,scale:cfg.lineScale});
    var enhancers=root.OssuaryExecutionEnhancers.create({rng:rng,config:o.bonusConfig.executionEnhancers});
    var preview=root.OssuaryEconomicRound.create({maxMultiple:cfg.maxMultiple});
    var bankByBet=new Map(),bank=null,bet=1,round=null,stepIndex=0,rootIndex=0,pending=null;
    var lockedGroups=0,collectWin=0,normal=null,raven=null,judgmentRecord=null,savedBaseCrows=null;
    var trace=[],detailed=true;

    // Unbiased cents: the same fractional prize has the same expectation at
    // every stake. Exact cents consume no draw. Costs are rounded separately.
    function money(n){var value=n*100,nearest=Math.round(value);
      if(Math.abs(value-nearest)<1e-7)return nearest/100;
      var lower=Math.floor(value);return (lower+(rng.chance(value-lower)?1:0))/100;}
    function range(a){return a[0]+rng.int(a[1]-a[0]+1);}
    function weighted(a){var sum=a.reduce(function(s,x){return s+x[1];},0),r=rng.next()*sum;
      for(var i=0;i<a.length;i++){r-=a[i][1];if(r<0)return a[i][0];}return a[a.length-1][0];}
    function clone(a){return JSON.parse(JSON.stringify(a));}
    function freshBank(){return {crows:[[],[]],chest:0,chestThreshold:range(cfg.chestThreshold),
      bladeMisses:0,bladeThreshold:range(cfg.bladeFloor),crowMisses:0,crowThreshold:range(cfg.crowFloor)};}
    function useBet(amount){var key=Math.round(amount*100);if(!bankByBet.has(key))bankByBet.set(key,freshBank());bank=bankByBet.get(key);}
    function setLocks(groups){lockedGroups=groups;reels.forEach(function(r){
      var group=r.id==="rib1"?1:r.id.indexOf("rib2-")===0?2:r.id.indexOf("rib3-")===0?3:0;
      r.locked=group>0&&group<=groups;r.lockedSymbol=r.locked?"RIB_BONUS":null;
      r.lockedGiantBlock=r.locked?{symbol:"RIB_BONUS"}:null;
    });}
    function boardOf(out){var b={};reels.forEach(function(r){r.cells.forEach(function(c,i){b[c.id]=out[r.id].symbols[i];});});return b;}
    function rawOutcomes(){var out={};reels.forEach(function(r){
      if(r.locked){r.giantSymbol=r.lockedSymbol;r.finalSymbols=r.cells.map(function(){return r.lockedSymbol;});}
      else outcome.prepareFinalSymbols(r);
      out[r.id]={giant:r.giantSymbol||null,symbols:r.finalSymbols.slice()};
    });return out;}
    function stripFor(r){return outcome.stripSymbolsForReel(r);}
    function replace(r,extra){var excluded=["CROWNED_SKULL","WILD","BONUS_RIB","RIB_BONUS","STERNUM_BONUS"].concat(extra||[]);
      return rng.pick(stripFor(r).filter(function(s){return excluded.indexOf(s)<0;}));}
    function cuttable(r,out){return !out[r.id].giant&&!r.locked;}
    function overlap(a,b){return Math.min(a.x+a.w/2,b.x+b.w/2)-Math.max(a.x-a.w/2,b.x-b.w/2)>Math.min(a.w,b.w)*.4;}
    function entries(out){var a=[];reels.forEach(function(r){if(!cuttable(r,out))return;r.cells.forEach(function(c,i){
      a.push({reel:r,cell:c,index:i,symbol:out[r.id].symbols[i],key:c.id});});});return a;}
    function below(e,out){return entries(out).filter(function(x){return x.cell.y>e.cell.y&&overlap(e.cell,x.cell);});}
    function crow(s){return s==="VERTEBRA"||s==="GOLDEN_CROW";}
    function shuffle(a){for(var i=a.length-1;i>0;i--){var j=rng.int(i+1),v=a[i];a[i]=a[j];a[j]=v;}return a;}
    function write(out,e,s){out[e.reel.id].symbols[e.index]=s;}
    function eligible(out){return entries(out).filter(function(e){return e.reel.type!=="sternum"&&
      cfg.forbiddenBlades.indexOf(e.cell.id)<0&&["CROWNED_SKULL","WILD","BONUS_RIB","RIB_BONUS","STERNUM_BONUS"].indexOf(e.symbol)<0;});}

    function prepareBlades(out,purchased,ravenSpin,ordinary){
      // Central reel never lands a small blade. This is selected here, before presentation.
      reels.forEach(function(r){if(out[r.id].giant)return;r.cells.forEach(function(c,i){
        if(out[r.id].symbols[i]==="CROWNED_SKULL"&&(r.type==="sternum"||cfg.forbiddenBlades.indexOf(c.id)>=0))out[r.id].symbols[i]=replace(r);
      });});
      var blades=entries(out).filter(function(e){return e.symbol==="CROWNED_SKULL";});
      if(blades.length){bank.bladeMisses=0;bank.bladeThreshold=range(cfg.bladeFloor);}
      else if(++bank.bladeMisses>=bank.bladeThreshold){var e=eligible(out),p=e.filter(function(x){return below(x,out).length;});
        if(e.length){write(out,rng.pick(p.length?p:e),"CROWNED_SKULL");bank.bladeMisses=0;bank.bladeThreshold=range(cfg.bladeFloor);}}
      blades=entries(out).filter(function(e){return e.symbol==="CROWNED_SKULL";});
      if(blades.length>cfg.maxBlades)shuffle(blades).slice(cfg.maxBlades).forEach(function(e){write(out,e,replace(e.reel));});
      if(ordinary){bank.crowMisses++;
        if(bank.crowMisses<bank.crowThreshold){entries(out).filter(function(e){return e.symbol==="CROWNED_SKULL";}).forEach(function(e){
          if(below(e,out).some(function(x){return crow(x.symbol);}))write(out,e,replace(e.reel,["VERTEBRA","GOLDEN_CROW"]));
        });}else{
          var spots=eligible(out).map(function(e){var b=below(e,out).find(function(x){return ["CROWNED_SKULL","WILD","BONUS_RIB","RIB_BONUS","STERNUM_BONUS"].indexOf(x.symbol)<0;});return b?{blade:e,crow:b}:null;}).filter(Boolean);
          if(spots.length){var spot=rng.pick(spots);write(out,spot.blade,"CROWNED_SKULL");write(out,spot.crow,"VERTEBRA");
            var other=entries(out).filter(function(e){return e.symbol==="CROWNED_SKULL"&&e.key!==spot.blade.key;});
            if(other.length>=cfg.maxBlades)shuffle(other).slice(cfg.maxBlades-1).forEach(function(e){write(out,e,replace(e.reel));});}
        }
      }
      var force=purchased?2:ravenSpin?(rng.chance(cfg.ravenDoubleChance)?2:1):0;
      if(force){var candidates=shuffle(eligible(out).filter(function(e){return e.reel.id!=="rib1"&&e.reel.id!=="rib2-left"&&below(e,out).length;}));
        entries(out).filter(function(e){return e.symbol==="CROWNED_SKULL";}).forEach(function(e){write(out,e,replace(e.reel));});
        var used=new Set(),selected=[];
        for(var k=0;k<candidates.length&&selected.length<force;k++){var e=candidates[k];if(used.has(e.key))continue;
          var b=below(e,out).find(function(x){return !used.has(x.key)&&["CROWNED_SKULL","WILD","BONUS_RIB","RIB_BONUS","STERNUM_BONUS"].indexOf(x.symbol)<0;});
          if(!b)continue;write(out,e,"CROWNED_SKULL");write(out,b,"VERTEBRA");used.add(e.key);used.add(b.key);selected.push(e);
        }
      }
      // Gold is an economic landing decision, never a render-cache decision.
      entries(out).filter(function(e){return e.reel.id!=="rib1"&&e.reel.type!=="sternum"&&e.symbol==="VERTEBRA";}).forEach(function(e){
        var can=entries(out).some(function(a){return a.reel.type!=="sternum"&&cfg.forbiddenBlades.indexOf(a.key)<0&&a.cell.y<e.cell.y&&overlap(a.cell,e.cell);});
        if(can&&rng.chance(cfg.goldenChance))write(out,e,"GOLDEN_CROW");
      });
    }

    function addCrow(slot,symbol){var member={value:symbol==="GOLDEN_CROW"?weighted(cfg.goldenMultipliers):1,
      golden:symbol==="GOLDEN_CROW",remaining:symbol==="GOLDEN_CROW"?range(cfg.goldenLifetime):null};bank.crows[slot].push(member);return clone(member);}
    function columnIds(slot){var anchor=byId.rib1.cells[slot===0?0:2];return reels.flatMap(function(r){return r.cells.filter(function(c){
      return c.y>=anchor.y&&anchor.x>=c.x-c.w/2&&anchor.x<=c.x+c.w/2;
    }).map(function(c){return c.id;});});}
    function postCuts(out,purchased,ravenSpin,ordinary,continuation){
      var all=entries(out),blades=all.filter(function(e){return e.symbol==="CROWNED_SKULL";}),claimed=new Set(blades.map(function(e){return e.key;}));
      var groups=blades.map(function(e){var falling=all.filter(function(x){return !claimed.has(x.key)&&x.cell.y>e.cell.y&&overlap(e.cell,x.cell);});
        falling.forEach(function(x){claimed.add(x.key);});return {blade:e.key,falling:falling.map(function(x){return x.key;}),crows:falling.filter(function(x){return crow(x.symbol);})};});
      var occupiedBefore=bank.crows.some(function(a){return a.length;}),doors=[],landings=[],wilds={},kills=[];
      groups.forEach(function(group){group.door=Boolean(purchased||ravenSpin||group.crows.length||(occupiedBefore&&rng.chance(cfg.perchedDoorChance)));
        if(group.door)doors.push(group.falling[0]||group.blade);});
      var crowGroups=groups.filter(function(g){return g.crows.length;});
      if(crowGroups.length&&ordinary){bank.crowMisses=0;bank.crowThreshold=range(cfg.crowFloor);}
      if(purchased){var slots=rng.chance(.5)?[1,0]:[0,1];crowGroups.forEach(function(g,i){g.crows.forEach(function(e){var slot=slots[i%2];landings.push({slot:slot,member:addCrow(slot,e.symbol)});});});
        slots.forEach(function(slot,i){if(i>=crowGroups.length)landings.unshift({slot:slot,member:addCrow(slot,"VERTEBRA")});});
      }else crowGroups.forEach(function(g){var slot=rng.int(2);g.crows.forEach(function(e){landings.push({slot:slot,member:addCrow(slot,e.symbol)});});});
      var stones=[];
      groups.filter(function(g){return g.door;}).forEach(function(){var slots=[0,1].filter(function(s){return bank.crows[s].length;});
        var p=ravenSpin?cfg.ravenStoneChances[Math.min(raven.spin-2,cfg.ravenStoneChances.length-1)]:slots.length/(slots.length+1);
        var hit=slots.length&&rng.chance(p);if(!hit){stones.push({slot:null});return;}
        var slot=rng.pick(slots),value=bank.crows[slot].reduce(function(s,m){return s+m.value;},0),ids=columnIds(slot);
        bank.crows[slot]=[];ids.forEach(function(id){wilds[id]=value;});kills.push(slot);stones.push({slot:slot,multiplier:value,cells:ids});
      });
      // The chest counts completed logical drops, including the small blade.
      var fallen=groups.reduce(function(s,g){return s+1+g.falling.length;},0);bank.chest+=fallen;
      var cut=new Set();groups.forEach(function(g){cut.add(g.blade);g.falling.forEach(function(id){cut.add(id);});});
      var doorSet=new Set(doors),board=boardOf(out),refills=[];
      reels.forEach(function(r){if(!cuttable(r,out)||r.type==="sternum")return;
        var sign=continuation&&r.id!=="rib1"?-r.scrollSign:r.scrollSign,ordered=r.cells.slice().sort(function(a,b){return (a.x-b.x)*(sign<0?-1:1);}),segment=[];
        function refill(c){var s=replace(r);board[c.id]=s;refills.push({cellId:c.id,reelId:r.id,symbol:s});}
        function compact(){if(!segment.some(function(c){return cut.has(c.id);}))return;
          var survivors=segment.filter(function(c){return !cut.has(c.id);}).map(function(c){return board[c.id];});
          segment.forEach(function(c,i){if(i<survivors.length)board[c.id]=survivors[i];else refill(c);});}
        ordered.forEach(function(c){if(doorSet.has(c.id)){compact();segment=[];board[c.id]=null;}
          else if(wilds[c.id]){compact();segment=[];if(cut.has(c.id))refill(c);}
          else segment.push(c);});compact();
      });
      groups.forEach(function(g){delete g.crows;});
      return {board:board,groups:groups,landings:landings,stones:stones,kills:kills,wilds:wilds,refills:refills,doors:doors,fallen:fallen};
    }

    function credit(plan,amount,source,suffix){var id=round.id+":step-"+stepIndex+":"+suffix;
      var result=preview.credit({roundId:preview.current().id,paymentId:id,amount:money(amount),source:source});
      if(!result.applied)throw new Error("Model credit rejected: "+result.reason);
      var entry={paymentId:id,roundId:round.id,source:source,raw:result.rawCents/100,amount:result.paidCents/100,clipped:result.clippedCents/100};
      plan.credits.push(entry);return entry;}
    function basePlan(){
      var isPurchased=round.product==="blade-spin"&&stepIndex===1,isRaven=Boolean(raven&&raven.spin>1),ordinary=round.product==="base"&&!isRaven&&lockedGroups===0;
      spinType=lockedGroups?"BONUS":"BASE";inline=false;state.bonusModeActive=false;state.currentSpinId=round.id+":"+stepIndex;
      if(ordinary)bank.crows=bank.crows.map(function(a){return a.filter(function(m){return m.remaining===null||--m.remaining>0;});});
      if(round.product==="bonus-game"&&stepIndex===1)state.purchasedForcedRibBonusQueue=[1,2];
      var initial=rawOutcomes();
      if(isPurchased&&initial.rib1.giant){initial.rib1={giant:null,symbols:byId.rib1.cells.map(function(){return replace(byId.rib1);})};byId.rib1.giantSymbol=null;}
      if(spinType==="BASE")prepareBlades(initial,isPurchased,isRaven,ordinary);
      var tease=null;
      if(spinType==="BASE"&&!isPurchased&&round.product!=="bonus-game"&&o.planTease){var input=initial.rib1.symbols.slice();tease=o.planTease({allowed:true,lands:initial.rib1.giant==="RIB_BONUS",symbols:input},rng);initial.rib1.symbols=input;}
      var final=initial,inlineOut=null,previousGroups=lockedGroups;
      if(spinType==="BASE"&&initial.rib1.giant==="RIB_BONUS"){
        setLocks(1);inline=true;inlineOut=rawOutcomes();inline=false;final=inlineOut;
        // Normalize the replacement outcome too; no post-selection visual edits.
        prepareBlades(final,false,isRaven,false);
      }
      var groups=final["rib3-left"].giant==="RIB_BONUS"?3:final["rib2-left"].giant==="RIB_BONUS"?2:final.rib1.giant==="RIB_BONUS"?1:0;
      var plan={kind:"base",spinType:spinType,initial:initial,inline:inlineOut,outcomes:final,tease:tease,credits:[],events:[],ravenSpin:raven?raven.spin:0};
      var cuts=spinType==="BASE"?postCuts(final,isPurchased,isRaven,ordinary,Boolean(inlineOut)):{board:boardOf(final),wilds:{},groups:[],landings:[],stones:[],kills:[],refills:[],doors:[],fallen:0};
      Object.assign(plan,cuts);plan.resolution=lines.resolve(cuts.board,bet,cuts.wilds);var win=money(plan.resolution.total);
      if(spinType==="BONUS")collectWin=money(collectWin+win);else {
        var lineCredit=credit(plan,win,isRaven?"raven_lines":"base_lines","lines");
        if(plan.resolution.total&&lineCredit.amount!==plan.resolution.total){var ratio=lineCredit.amount/plan.resolution.total;plan.resolution={bet:bet,total:lineCredit.amount,
          payouts:plan.resolution.payouts.map(function(p){return Object.assign({},p,{amount:p.amount*ratio});})};}
      }
      var displayedCrows=clone(bank.crows);
      if(cuts.kills.length){if(!raven){raven={spin:1,pending:0};savedBaseCrows=clone(bank.crows);bank.crows=[[],[]];}raven.pending+=cuts.kills.length;}
      plan.groupsLocked=groups;
      if(groups===3){setLocks(3);if(spinType==="BONUS"&&collectWin)credit(plan,collectWin,"collecting_lines","collect");collectWin=0;
        var superBonus=round.product!=="bonus-game"&&rng.chance(o.judgmentConfig.superChance);
        plan.nextFeature=superBonus?"judgment":"normal";pending=plan.nextFeature;raven=null;
      }else if(groups>previousGroups&&groups>=2){setLocks(groups);pending="base";}
      else{setLocks(0);if(spinType==="BONUS"&&collectWin)credit(plan,collectWin,"collecting_lines","collect");collectWin=0;
        var paid=plan.credits.reduce(function(s,e){return s+e.amount;},0);
        if(bank.chest>=bank.chestThreshold&&paid/bet>cfg.chestOpenMultiple){pending="wheel";plan.nextFeature="wheel";}
        else if(raven&&raven.pending>0&&raven.spin<cfg.ravenMaxSpins){raven.pending--;raven.spin++;pending="base";}
        else{pending=null;if(raven)bank.crows=[[],[]];raven=null;}
      }
      if(detailed)plan.crowState=displayedCrows;plan.chest={count:bank.chest,triggerCount:bank.chestThreshold};
      return plan;
    }

    function addHands(n){for(var i=0;i<n;i++){var def=cfg.handLevels[normal.level];
      if(normal.level===cfg.handLevels.length-1&&normal.count>=def[0])continue;
      if(++normal.count>=def[0]){normal.multiplier=def[1];if(normal.level<cfg.handLevels.length-1){normal.level++;normal.count=0;}else normal.count=def[0];}
    }}
    function normalPlan(){
      if(!normal)normal={chances:o.bonusConfig.modes.NORMAL_BONUS.awardedSpins,drops:0,slots:new Array(8).fill(null),level:0,count:0,multiplier:1,lastBreathUsed:0,spins:0};
      normal.spins++;var startChances=normal.chances--,plan={kind:"normal",credits:[],events:[],outcomes:{rib1:{giant:"RIB_BONUS",symbols:["RIB_BONUS","RIB_BONUS","RIB_BONUS"]}},startChances:startChances};
      var ids=layout.filter(function(r){return r.id!=="rib1"&&r.id!=="sternum";}).map(function(r){return r.id;});
      for(var i=0;i<8;i++){if(!normal.slots[i]){var s=rng.pick(symbols.WEIGHTED_FREE_SPIN_RIB_SYMBOLS);if(s!=="BONUS_EMPTY")normal.slots[i]={symbol:s,headCut:false};}
        var s=normal.slots[i]?normal.slots[i].symbol:"BONUS_EMPTY";plan.outcomes[ids[i]]={giant:s,symbols:[s,s]};}
      var p=symbols.BONUS_MODE_BLADE_CHANCE_BY_CHANCES[startChances],protection=symbols.BONUS_MODE_BLADE_DELAYED_START;
      var protectedDrop=normal.drops<protection.PROTECTED_DROPS;
      var blade=protectedDrop&&startChances===1||(!(protectedDrop&&protection.BLOCKED_CHANCES.indexOf(startChances)>=0)&&rng.chance(p));
      var sternum=blade?"BLADE_BONUS":rng.pick(symbols.BONUS_MODE_STERNUM_SYMBOLS.filter(function(s){return s!=="BLADE_BONUS";}));
      plan.outcomes.sternum={giant:sternum,symbols:[sternum,sternum,sternum]};
      plan.multiplier=normal.multiplier;plan.bloodMark=1;plan.handCount=0;plan.heads=[];plan.rows=[];
      if(blade){var count=normal.slots.filter(Boolean).length;plan.bloodMark=enhancers.rollBloodMark({skeletons:count});
        for(var row=0;row<4;row++){var value=0;for(var k=row*2;k<row*2+2;k++)if(normal.slots[k])value+=symbols.BONUS_MODE_SKELETON_PRIZES[normal.slots[k].symbol]*bet;
          if(value)plan.rows.push({rowIndex:row,credit:credit(plan,value*normal.multiplier*plan.bloodMark,"execution_hands","row-"+row)});}
        normal.drops++;normal.chances=o.bonusConfig.modes.NORMAL_BONUS.awardedSpins;plan.handCount=count;addHands(count);normal.slots.fill(null);
      }else if(sternum==="GUADANA_BONUS"){
        var total=0;normal.slots.forEach(function(slot,i){if(slot&&!slot.headCut){slot.headCut=true;var amount=money(symbols.BONUS_MODE_SKELETON_HEAD_PRIZES[slot.symbol]*bet*normal.multiplier);total+=amount;plan.heads.push({reelId:ids[i],symbol:slot.symbol,amount:amount});}});
        if(total)plan.headCredit=credit(plan,money(total),"execution_heads","heads");addHands(plan.heads.length);
      }
      plan.lastBreath=null;
      if(normal.chances===0&&enhancers.lastBreathApplies({skeletons:normal.slots.filter(Boolean).length,used:normal.lastBreathUsed})){
        plan.lastBreath=enhancers.rollLastBreath({used:normal.lastBreathUsed});if(plan.lastBreath){normal.lastBreathUsed++;normal.chances=enhancers.lastBreathSpins();}}
      if(detailed)plan.after=clone(normal);plan.done=normal.chances===0;
      pending=plan.done?null:"normal";return plan;
    }

    function wheelPlan(action){
      if(round.product==="chest-game"&&stepIndex===1)action="gamble";
      if(action!=="collect"&&action!=="gamble")throw new Error("Wheel requires collect or gamble");
      var plan={kind:"wheel",action:action,credits:[],events:[]};
      bank.chest=0;bank.chestThreshold=range(cfg.chestThreshold);
      if(action==="collect"){credit(plan,bet*cfg.collect,"wheel_cash","collect");pending=null;}
      else{var prize=weighted(cfg.wheel.map(function(p){return [p,p.weight];}));plan.prize=clone(prize);
        if(prize.bonus)pending=prize.bonus==="SUPER_BONUS"?"judgment":"normal";
        else{credit(plan,bet*prize.multiplier,"wheel_cash","gamble");pending=null;}}
      if(!pending&&raven&&raven.pending>0&&raven.spin<cfg.ravenMaxSpins){raven.pending--;raven.spin++;pending="base";}
      return plan;
    }
    function judgmentPlan(){
      var engine=root.OssuaryElJuicioEngine.create({config:o.judgmentConfig,random:function(){return rng.next();}}),s=engine.newSuper();
      var record={initial:detailed?clone(s):null,steps:[]},steps=0;
      while(!s.done){var ev=engine.step(s);if(detailed)record.steps.push({event:clone(ev),state:clone(s)});
        if(++steps>100000)throw new Error("Judgment exceeded diagnostic bound; round not silently truncated");}
      record.final=detailed?clone(s):s;judgmentRecord=record;
      var plan={kind:"judgment",credits:[],events:[],record:record};
      var payment=credit(plan,(s.rawWin==null?s.win:s.rawWin)*bet,"judgment","sentence");
      if(Math.round(payment.amount*100)!==Math.round(s.win*bet*100)){var shown=payment.amount/bet;record.final.win=shown;record.final.capped=true;
        var last=record.steps[record.steps.length-1];if(last){last.state.win=shown;last.state.capped=true;last.event.end.win=shown;last.event.end.capped=true;}}
      pending=null;return plan;
    }
    function start(product,amount,id){
      if(round&&pending)throw new Error("Model round is still active");
      if(!Number.isFinite(amount)||amount<.1||Math.abs(amount*10-Math.round(amount*10))>1e-7)throw new RangeError("Stake must use the game's 0.10 grid");
      if(!Object.prototype.hasOwnProperty.call(cfg.costs,product))throw new RangeError("Unknown economic product");
      bet=amount;useBet(amount);stepIndex=0;normal=null;judgmentRecord=null;collectWin=0;setLocks(0);inline=false;
      state.bonusModeActive=false;state.purchasedForcedRibBonusQueue=[];trace=[];detailed=true;
      round={id:id||"model-"+(++rootIndex),product:product,bet:bet};
      preview.close();preview.begin({bet:bet,cost:Math.round(bet*cfg.costs[product]*100)/100,product:product});
      if(product==="super-bonus")pending="judgment";
      else if(product==="chest-game")pending="wheel";
      else pending="base";
      raven=product==="blade-spin"?{spin:1,pending:0}:null;
      savedBaseCrows=null;
      if(product==="blade-spin"){savedBaseCrows=clone(bank.crows);bank.crows=[[],[]];}
      return clone(round);
    }
    function next(action){
      if(!pending)throw new Error("No pending economic transition");stepIndex++;
      var plan=pending==="base"?basePlan():pending==="normal"?normalPlan():pending==="judgment"?judgmentPlan():wheelPlan(action||"gamble");
      plan.step=stepIndex;plan.roundId=round.id;plan.pending=pending;if(detailed)plan.round=preview.current();
      if(!pending&&savedBaseCrows){bank.crows=savedBaseCrows;savedBaseCrows=null;}
      if(detailed)trace.push({step:stepIndex,kind:plan.kind,pending:pending,credits:clone(plan.credits)});
      return plan;
    }
    function run(product,amount,options){options=options||{};start(product,amount,options.id);detailed=Boolean(options.trace);var plans=options.trace?[]:null,count=0,previous=null;
      var features={normal:0,judgment:0,wheel:0,raven:0,normalSpins:0,ravenSpins:0,paidBaseSpins:0,paidRib1:0,paidRib2:0,rib1Attempts:0,rib1Lands:0,rib2Attempts:0,rib2Lands:0,rib3Attempts:0,chainComplete:0,chainNormal:0,chainJudgment:0},terminal=null;
      while(pending){var plan=next(pending==="wheel"?(options.wheelPolicy||"gamble"):undefined);if(plans)plans.push(plan);
        if(plan.kind==="normal"||plan.kind==="judgment"){
          if(!terminal)terminal={kind:plan.kind,rawCents:0};
          terminal.rawCents+=plan.credits.reduce(function(sum,c){return sum+Math.round(c.raw*100);},0);
        }
        // Observation only: counts selected real chain transitions, never RNG or outcomes.
        if(plan.kind==="base"&&product!=="bonus-game"){
          if(plan.spinType==="BASE"&&product!=="blade-spin"){
            features.rib1Attempts++;
            if(plan.initial.rib1.giant==="RIB_BONUS"){features.rib1Lands++;features.rib2Attempts++;}
          }
          if(product==="base"&&plan.step===1){features.paidBaseSpins++;
            if(plan.initial.rib1.giant==="RIB_BONUS")features.paidRib1++;
            if(plan.inline&&plan.inline["rib2-left"].giant==="RIB_BONUS")features.paidRib2++;}
          if(plan.inline&&plan.inline["rib2-left"].giant==="RIB_BONUS"){features.rib2Lands++;features.rib3Attempts++;}
          if(plan.spinType==="BONUS")features.rib3Attempts++;
          if(plan.groupsLocked===3){features.chainComplete++;
            features[plan.nextFeature==="judgment"?"chainJudgment":"chainNormal"]++;}
        }
        if(plan.kind==="normal"){features.normalSpins++;if(previous!=="normal")features.normal++;}
        if(plan.kind==="judgment")features.judgment++;
        if(plan.kind==="wheel")features.wheel++;
        if(plan.kind==="base"&&plan.ravenSpin){features.ravenSpins++;if(plan.ravenSpin===1||features.ravenSpins===1)features.raven++;}
        previous=plan.kind;
        if(++count>100000)throw new Error("Round exceeded diagnostic bound; no truncation applied");}
      var result=preview.close();if(terminal)terminal.fullCents=Math.min(terminal.rawCents,result.capCents);
      return Object.assign(result,{plans:plans,transitions:count,features:features,terminal:terminal});}
    return {start:start,next:next,run:run,pending:function(){return pending;},bank:function(){return clone(bank);},
      snapshot:function(){return {round:clone(round),pending:pending,normal:clone(normal),bank:clone(bank),trace:clone(trace)};},
      reset:function(){bankByBet.clear();bank=null;round=null;pending=null;preview.reset();},
      judgmentRecord:function(){return judgmentRecord;}};
  }
  root.OssuaryEconomicModel={create:create};
})(window);

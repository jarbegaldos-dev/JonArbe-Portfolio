(function () {
  "use strict";

  function createRngEngine(options) {
    options = options || {};
    var seed = options.seed;
    function seedWord(text, value) {
      for (var i=0;i<text.length;i++) value=Math.imul(value^text.charCodeAt(i),16777619)>>>0;
      value=Math.imul(value^value>>>16,0x85ebca6b);
      value=Math.imul(value^value>>>13,0xc2b2ae35);
      return (value^value>>>16)>>>0;
    }
    var text=String(seed==null?"":seed);
    var words=options.state||[2166136261,0x9e3779b9,0x243f6a88,0xb7e15162].map(function(s){return seedWord(text,s);});
    if(!Array.isArray(words)||words.length!==4||words.some(function(s){return !Number.isInteger(s)||s<0||s>0xffffffff;}))throw new RangeError("Invalid RNG state");
    if(!words.some(Boolean)){if(options.state)throw new RangeError("Zero RNG state");words[0]=1;}
    var s0=words[0],s1=words[1],s2=words[2],s3=words[3];
    var draws=options.draws==null?0:options.draws;
    if(!Number.isSafeInteger(draws)||draws<0)throw new RangeError("Invalid RNG draw count");
    var seeded=seed!=null||options.state!=null;
    var source = typeof options.source === "function"
      ? options.source
      : seeded ? function () {
          // xoshiro128** 1.1, Blackman/Vigna, public-domain reference:
          // https://prng.di.unimi.it/xoshiro128starstar.c
          // 128-bit state avoids a 32-bit cycle in multi-billion-draw audits.
          var x=Math.imul(s1,5),result=Math.imul((x<<7)|(x>>>25),9)>>>0;
          var t=s1<<9;
          s2^=s0;s3^=s1;s1^=s2;s0^=s3;s2^=t;s3=(s3<<11)|(s3>>>21);
          return result/4294967296;
        } : Math.random;

    function next() {
      var result = source();
      if (!(result >= 0 && result < 1)) throw new RangeError("RNG outside [0,1)");
      draws++;
      return result;
    }

    function int(maxExclusive) {
      return Math.floor(next() * maxExclusive);
    }

    function pick(items) {
      return items[int(items.length)];
    }

    function chance(probability) {
      return next() < probability;
    }

    return {
      next: next,
      int: int,
      pick: pick,
      chance: chance,
      snapshot: function () { return { seed: seed, algorithm:typeof options.source==="function"?"external":seeded?"xoshiro128**-1.1":"Math.random",
        state:[s0>>>0,s1>>>0,s2>>>0,s3>>>0],draws:draws }; }
    };
  }

  window.OssuaryRngEngine = {
    create: createRngEngine
  };
})();

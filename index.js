function u64(h, l) {
  this.hi = h >>> 0;
  this.lo = l >>> 0;
}

u64.prototype.isZero = function() {
  return (this.lo === 0) && (this.hi === 0);
}

u64.prototype.zero = function() {
  return new u64(0x0, 0x0);
}

u64.prototype.add = function(oWord) {
  var lowest, lowMid, highMid, highest; //four parts of the whole 64 bit number..

  //need to add the respective parts from each number and the carry if on is present..
  lowest = (this.lo & 0XFFFF) + (oWord.lo & 0XFFFF);
  lowMid = (this.lo >>> 16) + (oWord.lo >>> 16) + (lowest >>> 16);
  highMid = (this.hi & 0XFFFF) + (oWord.hi & 0XFFFF) + (lowMid >>> 16);
  highest = (this.hi >>> 16) + (oWord.hi >>> 16) + (highMid >>> 16);

  //now set the hgih and the low accordingly..
  this.lo = (lowMid << 16) | (lowest & 0XFFFF);
  this.hi = (highest << 16) | (highMid & 0XFFFF);

  return this; //for chaining..
};

function isLong(obj) {
  return (obj && obj["__isLong__"]) === true;
}

function fromNumber(value) {
  if (isNaN(value) || !isFinite(value))
    return u64.prototype.zero();
  var pow32 = (1 << 32);
  return new u64((value % pow32) | 0, (value / pow32) | 0);
}



u64.prototype.multiply = function(multiplier) {
  if (this.isZero())
    return this.zero();
  if (isLong(multiplier))
    multiplier = fromNumber(multiplier);
  if (multiplier.isZero())
    return this.zero();

  // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
  // We can skip products that would overflow.

  var a48 = this.hi >>> 16;
  var a32 = this.hi & 0xFFFF;
  var a16 = this.lo >>> 16;
  var a00 = this.lo & 0xFFFF;

  var b48 = multiplier.hi >>> 16;
  var b32 = multiplier.hi & 0xFFFF;
  var b16 = multiplier.lo >>> 16;
  var b00 = multiplier.lo & 0xFFFF;

  var c48 = 0,
    c32 = 0,
    c16 = 0,
    c00 = 0;
  c00 += a00 * b00;
  c16 += c00 >>> 16;
  c00 &= 0xFFFF;
  c16 += a16 * b00;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c16 += a00 * b16;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c32 += a32 * b00;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c32 += a16 * b16;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c32 += a00 * b32;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
  c48 &= 0xFFFF;
  return new u64((c48 << 16) | c32, (c16 << 16) | c00);
};

var charString2bytes = function(s) {
  for (var b = [], i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}

var numStringToInt32Buffer = function(s,base) {
  var bufferLength = 1;
  var r = new u256();
  if (!base) base = 16;
  var digits = 10;
  switch (base) {
    case 2:
      digits = 32;
      break;
    case 10:
      digits = 9;
      break;
    case 16:
      digits = 8;
      break;
    default:
      digits = Math.floor(9.63295986125/Math.log(base));
  }
  for (var i = 0; i < s.length; i++) {
    var temp = new u256();
    var slice = s.slice(i, i + 1);
    var n = parseInt(slice,base);
    temp.u32[0] = n;
    var height = s.length - i - 1;
    while (height > 0) {
      if (height >= 8) {
        temp = temp.multiplyWithInteger(1000000000);
        height -= 9;
      } else {
        temp = temp.multiplyWithInteger(Math.pow(10,height));
        height = 0;
      }
    }
    r.add(temp);
  }
  return r.u32;
}

var bytes2Int32Buffer = function(b) {
  var len = b.length;
  if (!len) return [];
  var bufferLength = len ? (((len - 1) >>> 2) + 1) : 0;
  var buffer = new Array(bufferLength);
  for (var j = 0; j < bufferLength; j++) {
    buffer[j] = (b[j * 4] << 24) | (b[j * 4 + 1] << 16) | (b[j * 4 + 2] << 8) | b[j * 4 + 3];
  }
  return buffer;
}


function u256(a,base) {
  if (a === undefined) {
    this.u32 = [0, 0, 0, 0, 0, 0, 0, 0];
  }
  else if (u256.prototype.isPrototypeOf(a)) {
    this.u32 = a.u32.slice();
  }
  else if (Number.isInteger(a)) {
    this.u32 = [0, 0, 0, 0, 0, 0, 0, a];
  }
  else if (typeof a === 'string' || a instanceof String) {
    if (base < 2) return Math.NaN;
    this.u32 = numStringToInt32Buffer(a,base);
  }
  else {
    this.u32 = a;
  }
}

u256.prototype.u16 = function() {
  var r16 = [];
  for (var i = 0; i < 8; i++) {
    r16.push(this.u32[i] & 0xFFFF);
    r16.push(this.u32[i] >>> 16);
  }
  return r16;
}

u256.prototype.importU16 = function(u16) {
  for (var i = 0; i < 8; i++) {
    this.u32[i] = u16[i * 2] + (u16[i * 2 + 1] << 16);
  }
}

u256.prototype.setCompact = function(nCompact) {
  var nSize = nCompact >>> 24;
  var nWord = new u256();
  nWord.u32[0] = nCompact & 0x007fffff;
  if (nSize <= 3) {
    nWord = nWord.shiftRight(8 * (3 - nSize));
  }
  else {
    nWord = nWord.shiftLeft(8 * (nSize - 3));
  }
  return nWord;
}

u256.prototype.bits = function() {
  for (var pos = 8 - 1; pos >= 0; pos--) {
    if (this.u32[pos]) {
      for (var bits = 31; bits > 0; bits--) {
        if (this.u32[pos] & 1 << bits)
          return 32 * pos + bits + 1;
      }
      return 32 * pos + 1;
    }
  }
  return 0;
}

u256.prototype.getCompact = function() {
  var nSize = (this.bits() + 7) / 8;
  var nCompact = 0;
  if (nSize <= 3) {
    nCompact = this.u32[0] << 8 * (3 - nSize);
  }
  else {
    var bn = this.shiftRight(8 * (nSize - 3));
    nCompact = bn.u32[0];
  }
  // The 0x00800000 bit denotes the sign.
  // Thus, if it is already set, divide the mantissa by 256 and increase the exponent.
  if (nCompact & 0x00800000) {
    nCompact >>= 8;
    nSize++;
  }
  // assert((nCompact & ~0x007fffff) == 0);
  // assert(nSize < 256);
  nCompact |= nSize << 24;
  return nCompact;
}

u256.prototype.plus = function(b) {
  var carry = 0;
  var r = new Array(16);
  var a16 = this.u16();
  var b16 = b.u16();
  for (var i = 0; i < 16; i++) {
    var sum = a16[i] + b16[i] + carry;
    r[i] = sum && 0xFFFF;
    carry = sum >> 16;
  }
  return new u256().importU16(r);
}

u256.prototype.add = function(b) {
  var carry = 0;
  var r = new Array(16);
  var a16 = this.u16();
  var b16 = b.u16();
  for (var i = 0; i < 16; i++) {
    var sum = a16[i] + b16[i] + carry;
    r[i] = sum & 0xFFFF;
    carry = sum >>> 16;
  }
  this.importU16(r);
  return this;
}

u256.prototype.addOne = function() {
  if (this.u16[15] === 0xFFFF) {
    this.u16[15]++;
  }
  else {
    var b = new u256(1);
    return this.add(b);
  }
}

u256.prototype.neg = function() {
  var r = new u256(0);
  for (var i = 0; i < 8; i++) {
    r.u32[i] = ~this.u32[i];
  }
  return r;
}

u256.prototype.subtract = function(b) {
  return this.add(b.neg().addOne());
}

u256.prototype.shiftLeft = function(bits) {
  var r = new u256();
  var k = bits / 64;
  bits = bits % 64;
  for (var i = 0; i < 8; i++) {
    if (i + k + 1 < 8 && bits != 0)
      r.u32[i + k + 1] |= (this.u32[i] >>> (32 - bits));
    if (i + k < 8)
      r.u32[i + k] |= (this.u32[i] << bits);
  }
  return r;
}

u256.prototype.shiftRight = function(bits) {
  var r = new u256();
  var k = bits / 64;
  bits = bits % 64;
  for (var i = 0; i < 8; i++) {
    if (i - k - 1 >= 0 && bits != 0)
      r.u32[i - k - 1] |= (this.u32[i] << (64 - bits));
    if (i - k >= 0)
      r.u32[i - k] |= (this.u32[i] >>> bits);
  }
  return r;
}

u256.prototype.supeq = function(b) {
  for (var i = 0; i < 8; i++) {
    if (this.u32[i] > b.u32[i]) return true;
    if (this.u32[i] !== b[i]) return false;
  }
  return true;
}

u256.prototype.divide = function(b) {
  var div = new u256(b); // make a copy, so we can shift.
  var num = new u256(this); // make a copy, so we can subtract.
  var r = new u256(); // the quotient.
  var num_bits = num.bits();
  var div_bits = div.bits();
  if (div_bits === 0) return Number.NaN();
  if (div_bits > num_bits) // the result is certainly 0.
    return r;
  var shift = num_bits - div_bits;
  div = div.shiftLeft(shift); // shift so that div and nun align.
  while (shift >= 0) {
    if (num.supeq(div)) {
      num = num.subtract(div);
      r.u32[shift / 32] |= (1 << (shift & 31)); // set a bit of the result.
    }
    div = div.shiftRight(1); // shift back.
    shift--;
  }
  // num now contains the remainder of the division.
  return r;
}

u256.prototype.toString = function(a) {
  var string = '';
  var array = this.u32;
  for (var i in array) {
    var s = array[i];
    if (s < 0) {
      s = 0xFFFFFFFF + array[i] + 1;
    }
    var l = s.toString(16);
    var padding = 8;
    while (l.length < padding) {
      l = "0" + l;
    }
    string += l;
  }
  return string;
}

u256.prototype.toString = function() {
  return this.toString(16);
}

u256.prototype.multiplyWithInteger = function(b) {
  var carry = 0;
  var a = new u256(this);
  for (var i = 0; i < 8; i++) {
    var multiplied = new u64(0, b).multiply(new u64(0, a.u32[i]));
    if (carry) {
      var added = new u64(0, multiplied.lo).add(new u64(0, carry));
      a.u32[i] = added.lo;
      carry = multiplied.hi + added.hi;
    }
    else {
      a.u32[i] = multiplied.lo;
      carry = multiplied.hi;
    }
  }
  return a;
}

module.exports = u256;
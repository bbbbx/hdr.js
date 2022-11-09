
const int NATIVE_CHARACTER_RES = 8;

const int _0_ = 48;
const int _1_ = 49;
const int _2_ = 50;
const int _3_ = 51;
const int _4_ = 52;
const int _5_ = 53;
const int _6_ = 54;
const int _7_ = 55;
const int _8_ = 56;
const int _9_ = 57;
const int _A_ = 65;
const int _B_ = 66;
const int _C_ = 67;
const int _D_ = 68;
const int _E_ = 69;
const int _F_ = 70;
const int _G_ = 71;
const int _H_ = 72;
const int _I_ = 73;
const int _J_ = 74;
const int _K_ = 75;
const int _L_ = 76;
const int _M_ = 77;
const int _N_ = 78;
const int _O_ = 79;
const int _P_ = 80;
const int _Q_ = 81;
const int _R_ = 82;
const int _S_ = 83;
const int _T_ = 84;
const int _U_ = 85;
const int _V_ = 86;
const int _W_ = 87;
const int _X_ = 88;
const int _Y_ = 89;
const int _Z_ = 90;
const int _MINUS_ = 45;
const int _COMMA_ = 44;
const int _DOT_ = 46;
const int _PLUS_ = 43;
const int _SPC_ = 32;
const int _QUESTIONMARK_ = 63;

uniform sampler2D uMiniFontTexture;

int clamp(int value, int minValue, int maxValue) {
  return value < minValue
    ? minValue
    : value > maxValue
      ? maxValue
      : value;
}

float SampleMiniFont(int InAsciiCode, ivec2 Position) {
  // Limit ASCII character to the Standard character set (32 - 127)
  int TextureCode = clamp(InAsciiCode, 32, 127) - 32;
  return texture2D(
    uMiniFontTexture,
    (vec2(TextureCode * NATIVE_CHARACTER_RES + Position.x, Position.y) + vec2(0.5)) / vec2(NATIVE_CHARACTER_RES * (127-32+1), NATIVE_CHARACTER_RES),
    -1000.0
  ).r;
}


void PrintCharacter(
  ivec2 PixelPos,
  inout vec3 OutColor,
  vec3 FontColor,
  inout ivec2 LeftTop,
  int CharacterID
) {
  ivec2 Rel = (PixelPos - LeftTop);

  if (Rel.x >= 0 && Rel.x < NATIVE_CHARACTER_RES &&
    Rel.y >= 0 && Rel.y < NATIVE_CHARACTER_RES) {
    OutColor.rgb = mix(OutColor.rgb, FontColor, SampleMiniFont(CharacterID, Rel));
  }

  LeftTop.x += NATIVE_CHARACTER_RES;
}

int ExtractDigitFromFloat(float Number, float DigitValue) {
  float Temp = floor(Number / DigitValue);
  return int(mod(Temp, 10.)) + _0_;
}

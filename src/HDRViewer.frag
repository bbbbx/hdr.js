
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uExposure;
uniform float uGamma;
uniform vec2 uSize;
uniform vec4 uViewport;
uniform mat3 uTransform;

void PrintHDRFloat(
  ivec2 PixelPos,
  inout vec3 OutColor,
  vec3 FontColor,
  ivec2 LeftTop,
  float Number
) {
  ivec2 Cursor = LeftTop;
  int Digit;

  for (float i = 10.0; i > 0.0; i--) {
    Digit = ExtractDigitFromFloat(Number, pow(10.0, i));
    if (Digit != _0_) {
      PrintCharacter(PixelPos, OutColor, FontColor, Cursor, Digit);
    }
  }

  Digit = ExtractDigitFromFloat(Number, 1.0);
  PrintCharacter(PixelPos, OutColor, FontColor, Cursor, Digit);

  PrintCharacter(PixelPos, OutColor, FontColor, Cursor, _DOT_);

  Digit = ExtractDigitFromFloat(Number, 0.1);
  PrintCharacter(PixelPos, OutColor, FontColor, Cursor, Digit);
  Digit = ExtractDigitFromFloat(Number, 0.01);
  PrintCharacter(PixelPos, OutColor, FontColor, Cursor, Digit);
  Digit = ExtractDigitFromFloat(Number, 0.001);
  PrintCharacter(PixelPos, OutColor, FontColor, Cursor, Digit);
  Digit = ExtractDigitFromFloat(Number, 0.0001);
  PrintCharacter(PixelPos, OutColor, FontColor, Cursor, Digit);
}

float checker(vec2 uv, float repeats) {
  float cx = floor(repeats * uv.x);
  float cy = floor(repeats * uv.y);
  float result = mod(cx + cy, 2.0);
  return result > 0.0 ?
    204./255. :
    1.0;
}

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  uv *= uViewport.zw / uSize;
  uv = (uTransform * vec3(uv, 1)).xy;

  vec3 hdrData = texture2D(uTexture, uv).rgb;
  gl_FragColor.rgb = hdrData.rgb;
  gl_FragColor.a = 1.0;

  gl_FragColor.rgb *= uExposure;
  gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(1./uGamma));

  vec2 scale = vec2(uTransform[0][0], uTransform[1][1]);

  vec2 texelSize = vec2(1) / uSize * scale;
  vec2 gap = texelSize * 3.0;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    float repeats = 50.0;
    gl_FragColor.rgb = vec3(checker(vec2(uv.x * (uSize.x/uSize.y), uv.y), repeats));
    return;
  }

  gl_FragColor.a = 1.0;

  float minScale = 4.0 / min(uViewport.z, uViewport.w);
  if (uTransform[0][0] < (minScale * 2.0)) {
    vec2 fontUV = fract(uv*uSize) * float(NATIVE_CHARACTER_RES);

    ivec2 pixelPosLocal = ivec2(fontUV * 10.);

    ivec2 leftTop = ivec2(NATIVE_CHARACTER_RES, NATIVE_CHARACTER_RES * 2);
    vec3 fontColor = vec3(0.8, 0, 0);
    PrintHDRFloat(
      pixelPosLocal,
      gl_FragColor.rgb,
      vec3(0),
      ivec2(leftTop.x, leftTop.y+1),
      hdrData.r
    );
    PrintHDRFloat(
      pixelPosLocal,
      gl_FragColor.rgb,
      fontColor,
      leftTop,
      hdrData.r
    );

    leftTop.y += NATIVE_CHARACTER_RES * 2;
    fontColor = vec3(0, 0.8, 0);
    PrintHDRFloat(
      pixelPosLocal,
      gl_FragColor.rgb,
      vec3(0),
      ivec2(leftTop.x, leftTop.y+1),
      hdrData.g
    );
    PrintHDRFloat(
      pixelPosLocal,
      gl_FragColor.rgb,
      fontColor,
      leftTop,
      hdrData.g
    );

    leftTop.y += NATIVE_CHARACTER_RES * 2;
    fontColor = vec3(0, 0, 0.8);
    PrintHDRFloat(
      pixelPosLocal,
      gl_FragColor.rgb,
      vec3(0),
      ivec2(leftTop.x, leftTop.y+1),
      hdrData.b
    );
    PrintHDRFloat(
      pixelPosLocal,
      gl_FragColor.rgb,
      fontColor,
      leftTop,
      hdrData.b
    );
  }
}
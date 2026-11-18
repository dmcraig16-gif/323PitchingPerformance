# 323 logo source

- `logo-323-original.webp`: the original logo (white sticker background, navy lettering).
- `make_logo.py`: makes the dark-background version used on the website. It removes the white
  background, the sticker outline and the gray shadow, and turns the navy white.

```
pip install pillow numpy scipy
python3 brand/make_logo.py brand/logo-323-original.webp website/assets/logo-323.png
```

Smaller sizes (`logo-323-720`, `logo-323-240`), the favicon, the home-screen icon and the share
image are all cut from `logo-323.png`.

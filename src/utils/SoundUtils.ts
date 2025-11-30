import type { SoundCategory } from "../types/Item";


export const playPickupSound = (sound: SoundCategory | null = null) => {
    let sounds;
    switch (sound) {
        case "WOOD": 
            sounds = ["./sounds/wood/place1.mp3", "./sounds/wood/place2.mp3", "./sounds/wood/place3.mp3", "./sounds/wood/place4.mp3", "./sounds/wood/place5.mp3", "./sounds/wood/place6.mp3"];
            break;
        case "METAL": 
            sounds = ["./sounds/metal/place1.mp3", "./sounds/metal/place2.mp3", "./sounds/metal/place3.mp3", "./sounds/metal/place4.mp3"];
            break;
        case "WOOL": 
            sounds = ["./sounds/wool/dig1.mp3", "./sounds/wool/dig2.mp3", "./sounds/wool/dig3.mp3", "./sounds/wool/dig4.mp3"];
            break;
        case "GRASS": 
            sounds = ["./sounds/grass/place1.mp3", "./sounds/grass/place2.mp3", "./sounds/grass/place3.mp3", "./sounds/grass/place4.mp3", "./sounds/grass/place5.mp3"];
            break;
        case "SAND": 
            sounds = ["./sounds/sand/place1.mp3", "./sounds/sand/place2.mp3", "./sounds/sand/place3.mp3", "./sounds/sand/place4.mp3", "./sounds/sand/place5.mp3", "./sounds/sand/place6.mp3"];
            break;
        case "STONE": 
            sounds = ["./sounds/stone/place1.mp3", "./sounds/stone/place2.mp3", "./sounds/stone/place3.mp3", "./sounds/stone/place4.mp3", "./sounds/stone/place5.mp3", "./sounds/stone/place6.mp3"];
            break;
        case "GRAVEL":
            sounds = ["./sounds/gravel/place1.mp3", "./sounds/gravel/place2.mp3", "./sounds/gravel/place3.mp3", "./sounds/gravel/place4.mp3"];
            break;
        default:
            sounds = ["./sounds/wool/dig1.mp3", "./sounds/wool/dig2.mp3", "./sounds/wool/dig3.mp3", "./sounds/wool/dig4.mp3"];
            break;
    }
    playRandomAudio(sounds, 0.6);
};

export const playPutDownSound = (sound: SoundCategory | null = null) => {
    let sounds;
    switch (sound) {
        case "WOOD": 
            sounds = ["./sounds/wood/place1.mp3", "./sounds/wood/place2.mp3", "./sounds/wood/place3.mp3", "./sounds/wood/place4.mp3", "./sounds/wood/place5.mp3", "./sounds/wood/place6.mp3"];
            break;
        case "METAL": 
            sounds = ["./sounds/metal/place1.mp3", "./sounds/metal/place2.mp3", "./sounds/metal/place3.mp3", "./sounds/metal/place4.mp3"];
            break;
        case "WOOL": 
            sounds = ["./sounds/wool/dig1.mp3", "./sounds/wool/dig2.mp3", "./sounds/wool/dig3.mp3", "./sounds/wool/dig4.mp3"];
            break;
        case "GRASS": 
            sounds = ["./sounds/grass/place1.mp3", "./sounds/grass/place2.mp3", "./sounds/grass/place3.mp3", "./sounds/grass/place4.mp3", "./sounds/grass/place5.mp3"];
            break;
        case "SAND": 
            sounds = ["./sounds/sand/place1.mp3", "./sounds/sand/place2.mp3", "./sounds/sand/place3.mp3", "./sounds/sand/place4.mp3", "./sounds/sand/place5.mp3", "./sounds/sand/place6.mp3"];
            break;
        case "STONE": 
            sounds = ["./sounds/stone/place1.mp3", "./sounds/stone/place2.mp3", "./sounds/stone/place3.mp3", "./sounds/stone/place4.mp3", "./sounds/stone/place5.mp3", "./sounds/stone/place6.mp3"];
            break;
        case "GRAVEL":
            sounds = ["./sounds/gravel/place1.mp3", "./sounds/gravel/place2.mp3", "./sounds/gravel/place3.mp3", "./sounds/gravel/place4.mp3"];
            break;
        default:
            sounds = ["./sounds/wool/dig1.mp3", "./sounds/wool/dig2.mp3", "./sounds/wool/dig3.mp3", "./sounds/wool/dig4.mp3"];
            break;
    }
    playRandomAudio(sounds, 0.6);
};

export const playDragSound = (sound: SoundCategory | null = null) => {
    let sounds;
    switch (sound) {
        case "WOOD": 
            sounds = ["./sounds/wood/drag1.mp3", "./sounds/wood/drag2.mp3", "./sounds/wood/drag3.mp3", "./sounds/wood/drag4.mp3", "./sounds/wood/drag5.mp3"];
            break;
        case "METAL": 
            sounds = ["./sounds/metal/drag1.mp3", "./sounds/metal/drag2.mp3", "./sounds/metal/drag3.mp3", "./sounds/metal/drag4.mp3", "./sounds/metal/drag5.mp3", "./sounds/metal/drag6.mp3"];
            break;
        case "WOOL": 
            sounds = ["./sounds/wool/dig1.mp3", "./sounds/wool/dig2.mp3", "./sounds/wool/dig3.mp3", "./sounds/wool/dig4.mp3"];
            break;
        case "GRASS": 
            sounds = ["./sounds/grass/drag1.mp3", "./sounds/grass/drag2.mp3", "./sounds/grass/drag3.mp3", "./sounds/grass/drag4.mp3", "./sounds/grass/drag5.mp3", "./sounds/grass/drag6.mp3"];
            break;
        case "SAND": 
            sounds = ["./sounds/sand/drag1.mp3", "./sounds/sand/drag2.mp3", "./sounds/sand/drag3.mp3", "./sounds/sand/drag4.mp3", "./sounds/sand/drag5.mp3"];
            break;
        case "STONE": 
            sounds = ["./sounds/stone/drag1.mp3", "./sounds/stone/drag2.mp3", "./sounds/stone/drag3.mp3", "./sounds/stone/drag4.mp3"];
            break;
        case "GRAVEL":
            sounds = ["./sounds/gravel/drag1.mp3", "./sounds/gravel/drag2.mp3", "./sounds/gravel/drag3.mp3", "./sounds/gravel/drag4.mp3"];
            break;
        default:
            sounds = ["./sounds/wool/dig1.mp3", "./sounds/wool/dig2.mp3", "./sounds/wool/dig3.mp3", "./sounds/wool/dig4.mp3"];
            break;
    }
    playRandomAudio(sounds, 0.2);
};


export const playSwapSound = () => {
    let sounds = ["./sounds/default/swap1.mp3", "./sounds/default/swap2.mp3", "./sounds/default/swap3.mp3"];
    playRandomAudio(sounds, 0.4);
};


export const playClickSound = () => {
    const sounds = [
        "./sounds/click.mp3"
    ];
    playRandomAudio(sounds, 0.2);
};

export function getVolume() {
  const v = localStorage.getItem("volume");
  return v ? parseFloat(v) : 0.5;
}

export function setVolume(v: number) {
  localStorage.setItem("volume", String(v));
}

function playRandomAudio(sounds: string[], volume: number) {
    const sound = sounds[Math.floor(Math.random() * sounds.length)];
    const audio = new Audio(sound);
    audio.volume = volume * getVolume();
    audio.play().catch(() => { });
}
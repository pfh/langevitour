
/**** Utility functions ****/

export function has(object: any, name: string) {
    return object.hasOwnProperty(name);
}

export function elementVisible(el: HTMLElement) {
    // Check several ways of hiding an element or its parents.
    // Hopefully this will work for slideshows.
    let parent = el;
    while(true) {
        let style = window.getComputedStyle(parent);
        if (style.opacity === "0" || style.display === "none" || style.visibility !== "visible")
            return false;
        if (!parent.parentElement) 
            break;
        parent = parent.parentElement;
    }

    //https://stackoverflow.com/a/22480938    
    let rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom >= 0 &&
           rect.left < window.innerWidth && rect.right >= 0;
}

export function hexByte(value: number) {
    value = Math.max(0,Math.min(255,Math.round(value)));
    return (value<16?'0':'')+value.toString(16);
}

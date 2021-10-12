import { surroundSelection } from "../editorHelpers";

const headerWordPattern = /#{1,6} .+|.+/;
export function toggleTitleH1() {
    return surroundSelection("# ", "", headerWordPattern);
}

export function toggleTitleH2() {
    return surroundSelection("## ", "", headerWordPattern);
}

export function toggleTitleH3() {
    return surroundSelection("### ", "", headerWordPattern);
}

export function toggleTitleH4() {
    return surroundSelection("#### ", "", headerWordPattern);
}

export function toggleTitleH5() {
    return surroundSelection("##### ", "", headerWordPattern);
}

export function toggleTitleH6() {
    return surroundSelection("###### ", "", headerWordPattern);
}

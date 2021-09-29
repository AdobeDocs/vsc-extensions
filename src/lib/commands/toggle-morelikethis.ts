import { newLine } from "../commands";
import { surroundBlockSelection } from "../editorHelpers";

const startingMoreLikeThis = ">[!MORELIKETHIS]" + newLine + ">" + newLine;
const endingMoreLikeThis = newLine;
const moreLikeThisBlockWordPattern = new RegExp(
  startingMoreLikeThis + ".+" + endingMoreLikeThis + "|.+",
  "gm"
);
export function toggleMoreLikeThis(): Thenable<boolean | void> {
  return surroundBlockSelection(
    startingMoreLikeThis,
    endingMoreLikeThis,
    moreLikeThisBlockWordPattern
  );
}

export function createSessionStats(){return{answered:0,correct:0,repairPracticed:0}}
export function recordAnswer(stats,correct){return{...stats,answered:stats.answered+1,correct:stats.correct+(correct?1:0)}}
export function recordRepairPractice(stats){return{...stats,repairPracticed:stats.repairPracticed+1}}
export function completionMessage(stats){const total=stats.answered||0,correct=stats.correct||0,repairs=stats.repairPracticed||0;if(!total)return"本次尚未记录答题。";const wrong=total-correct;return `本次答题 ${total} 道，答对 ${correct} 道${wrong?`，答错 ${wrong} 道`:""}。${repairs?`进行了 ${repairs} 次演示修复练习。`:"未进行错题修复练习。"}`}

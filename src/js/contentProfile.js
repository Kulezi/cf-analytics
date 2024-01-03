var problems = new Map();
var contests = new Map();
var ratings = new Map();
var tags = new Map();
var ratingChartLabel = [];
var solvedRatingChartData = [];
var solvedRatingChartBackgroundColor = [];
var unsolvedRatingChartData = [];
var unsolvedRatingChartBackgroundColor = [];
var tagChartLabel = [];
var tagChartData = [];
ratings[Symbol.iterator] = function* () {
  yield* [...ratings.entries()].sort((a, b) => {
    if (a[0] < b[0]) {
      return -1;
    } else if (a[0] > b[0]) {
      return 1;
    } else return 0;
  });
}
tags[Symbol.iterator] = function* () {
  yield* [...tags.entries()].sort((a, b) => {
    if (a[1] < b[1]) {
      return 1;
    } else if (a[1] > b[1]) {
      return -1;
    } else return 0;
  });
}
//Material Design 400 light
const colorArray = ['#ff867c', '#ff77a9', '#df78ef', '#b085f5', '#8e99f3', '#80d6ff', '#73e8ff', '#6ff9ff', '#64d8cb', '#98ee99', '#cfff95', '#ffff89', '#ffff8b', '#fffd61', '#ffd95b', '#ffa270'];
chrome.runtime.sendMessage({ todo: "appendHTML" }, async function (response) {
  $('#pageContent').append(response.htmlResponse);
  const profileId = getProfileIdFromUrl(window.location.href);
  console.log(profileId);
  await $.get(`https://codeforces.com/api/user.status?handle=${profileId}`, async function (data) {
    if (data.status == "OK") {
      //processdata
      await processData(data.result);
      createUnsolvedChart();
      createProblemRatingChart();
      createTagChart();
    } else {
      //response not loaded
      console.error(data.status + ' : ' + data.comment);
    }
  })
});
function getProfileIdFromUrl(url) {
  var arr = url.split("/");
  var temp = arr.slice(-1);
  temp = temp[0].split('?', 1);
  return temp;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processData(resultArr) {
  var contestProblems = new Map();
  await $.get(`https://codeforces.com/api/problemset.problems`, function (data) {
    if (data.status == "OK") {
      console.log("OK");
      for (var i = 0; i < data.result.problems.length; i++) {
        var problem = data.result.problems[i];
        var problemId = problem.contestId + '-' + problem.index;
        if (!contestProblems.has(problem.contestId)) {
          contestProblems.set(problem.contestId, [problem]);
        } else {
          var oldProblems = contestProblems.get(problem.contestId);
          oldProblems.push(problem);
          contestProblems.set(problem.contestId, oldProblems);
        }
      }
    } else {
      console.log(data.status);
    }
  });

  // console.log(contestProblems);

  for (var i = resultArr.length - 1; i >= 0; i--) {
    var sub = resultArr[i];
    var contestId = sub.contestId;
    if (sub.author.participantType == "CONTESTANT" || sub.author.participantType == "VIRTUAL") {
      if (!contestProblems.has(contestId)) {
        console.log(`encountered problem from unknown contest ${contestId}!`);
      } else {
        var p = contestProblems.get(contestId);
        p.forEach(function (problem) {
          var problemId = problem.contestId + '-' + problem.index;
          // console.log(problemId);
          if (!problems.has(problemId)) {
            problems.set(problemId, {
              solved:false,
              rating:problem.rating,
              contestId: problem.contestId,
              index: problem.index,
              tags: problem.tags,
            });
          }
        });
      }
    }
    

    var problemId = sub.problem.contestId + '-' + sub.problem.index;
    if (!problems.has(problemId)) {
      problems.set(problemId, {
        solved: false,
        rating: sub.problem.rating,
        contestId: sub.problem.contestId,
        index: sub.problem.index,
        tags: sub.problem.tags,
      });
    }
    if (sub.verdict == "OK") {
      let obj = problems.get(problemId);
      obj.solved = true;
      problems.set(problemId, obj);
    }
  }
}

function createUnsolvedChart() {
  let unsolvedCount = 0;

  for (let r = 0; r <= 4000; r += 100) {
    $(`#unsolved_table`).append(`
      <tr>
        <td>${r}</td>
        <td id="unsolved_list${r}"></td>
        </tr>`);
  }
  $(`#unsolved_table`).append(`
    <tr>
      <td>Unknown</td>
      <td id="unsolved_listundefined"></td>
    </tr>`);

  problems.forEach(function (prob) {
    if (prob.rating) {
      if (!ratings.has(prob.rating)) {
        ratings.set(prob.rating, {solved: 0, unsolved: 0});
      }
      let cnt = ratings.get(prob.rating);
      if (prob.solved === true) cnt.solved++;
      else cnt.unsolved++;
      ratings.set(prob.rating, cnt);
    }

    if (prob.solved === false) {
      unsolvedCount++;
      const problemURL = findProblemURL(prob.contestId, prob.index);
      $(`#unsolved_list${prob.rating}`).append(`
              <a class="unsolved_problem" href="${problemURL}">
                ${prob.contestId}-${prob.index}
              </a> 
      `);
    }
    if (prob.solved === true) {
      prob.tags.forEach(function (tag) {
        if (!tags.has(tag)) {
          tags.set(tag, 0);
        }
        let cnt = tags.get(tag);
        cnt++;
        tags.set(tag, cnt);
      })
    }
  })
  $('#unsolved_count').text(`Count : ${unsolvedCount}`);
  for (let [key, val] of ratings) {
    // console.log(key+'-'+val);
    ratingChartLabel.push(key);
    solvedRatingChartData.push(val.solved);
    solvedRatingChartBackgroundColor.push(ratingBackgroundColor(key));
    
    unsolvedRatingChartData.push(val.unsolved);
    unsolvedRatingChartBackgroundColor.push(ratingBackgroundColor(key));
  }
}

function findProblemURL(contestId, index) {
  if (contestId && contestId.toString().length <= 4) {
    return `https://codeforces.com/problemset/problem/${contestId}/${index}`;
  } else {
    return `https://codeforces.com/problemset/gymProblem/${contestId}/${index}`;
  }
}
function createProblemRatingChart() {
  var ctx = document.getElementById('problemRatingChart').getContext('2d');
  var myChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ratingChartLabel,
      datasets: [{
        label: 'Problems Solved',
        data: solvedRatingChartData,
        backgroundColor: solvedRatingChartBackgroundColor,
        borderColor: 'rgba(22, 177, 22, 1)',//ratingChartBorderColor,
        borderWidth: 3,
      },{
        label: 'Problems Unsolved',
        data: unsolvedRatingChartData,
        backgroundColor: unsolvedRatingChartBackgroundColor,
        borderColor: 'rgba(177, 22, 22, 1)',
        borderWidth: 3,
      }]
    },
    options: {
      aspectRatio: 2.5,
      scales: {
        x: {
          title: {
            text: 'Problem Rating',
            display: false,
          }
        },
        y: {
          title: {
            text: 'Problems Solved',
            display: false,
          },
          beginAtZero: true
        }
      }
    }
  });
}

function createTagChart() {
  for (let [key, val] of tags) {
    // console.log(key + '-' + val);
    tagChartLabel.push(key);
    tagChartData.push(val);
  }

  var ctx = document.getElementById('tagChart').getContext('2d');
  var myChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: tagChartLabel,
      datasets: [{
        label: 'Tags Solved',
        data: tagChartData,
        backgroundColor: colorArray,
        // borderColor: 'rgba(0,0,0,0.5)',//ratingChartBorderColor,
        borderWidth: 0.5,
        // spacing: 5,
      }]
    },
    options: {
      aspectRatio: 2,
      plugins: {
        legend: {
          display: false,
          position: 'right',
        },
      }
    },
  });
  for (var i = 0; i < tagChartLabel.length; i++) {
    $('#legend_unordered_list').append(`<li>
    <svg width="12" height="12">
      <rect width="12" height="12" style="fill:${colorArray[i % (colorArray.length)]};stroke-width:1;stroke:rgb(0,0,0)" />
    </svg>
    ${tagChartLabel[i]} : ${tagChartData[i]}
    </li>`)
  }
}
function ratingBackgroundColor(rating) {
  const legendaryGrandmaster = 'rgba(170,0  ,0  ,0.9)';
  const internationalGrandmaster = 'rgba(255,51 ,51 ,0.9)';
  const grandmaster = 'rgba(255,119,119,0.9)';
  const internationalMaster = 'rgba(255,187,85 ,0.9)';
  const master = 'rgba(255,204,136,0.9)';
  const candidateMaster = 'rgba(255,136,255,0.9)';
  const expert = 'rgba(170,170,255,0.9)';
  const specialist = 'rgba(119,221,187,0.9)';
  const pupil = 'rgba(119,255,119,0.9)';
  const newbie = 'rgba(204,204,204,0.9)';
  if (rating >= 3000) {
    return legendaryGrandmaster;
  } else if (rating >= 2600 && rating <= 2999) {
    return internationalGrandmaster;
  } else if (rating >= 2400 && rating <= 2599) {
    return grandmaster;
  } else if (rating >= 2300 && rating <= 2399) {
    return internationalMaster;
  } else if (rating >= 2100 && rating <= 2299) {
    return master;
  } else if (rating >= 1900 && rating <= 2099) {
    return candidateMaster;
  } else if (rating >= 1600 && rating <= 1899) {
    return expert;
  } else if (rating >= 1400 && rating <= 1599) {
    return specialist;
  } else if (rating >= 1200 && rating <= 1399) {
    return pupil;
  } else {
    return newbie;
  }
}
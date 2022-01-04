const { ObjectID } = require('bson');
const express = require('express');
const app = express();
const port = 3000;
const { MongoClient } = require('mongodb');
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbs_name = 'wpr-quiz';

let i = null;
let _id = null;
let db = null;
let questionsData = null;
let answersCheck = {};
const responses = [];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function getData() {
    await client.connect();
    db = client.db(dbs_name);
    questionsData = db.collection('questions');
}

app.post('/attempts', async (req, res) => {
    _id = ObjectID();
    const quesData = await questionsData.aggregate([{ $sample: { size: 10 } }]).toArray();
    const questions = quesData.map((question) => {
        return {
            _id: question._id,
            answers: question.answers,
            text: question.text,
        };
    });

    const results = {
        _id: _id,
        questions: questions,
        completed: false,
        score: 0,
        startedAt: new Date(),
    };

    res.status(201).json(results).end();
    answersCheck = getCorrectAnswers(quesData);
    responses.push(results);
    
});

app.post('/attempts/:id/submit', async (req, res, next) => {
    const params = req.params;
    const body = req.body;
    const _idAttempts = params.id;
    const answers = body.answers;
    const resResults = getMatchedQuestions(_idAttempts);
    const checkComplete = resResults.completed;
    if (answers === undefined) {
        res.status(201).json(resResults).end();
    } else if (checkComplete === false && answers !== undefined) {
        resResults['answers'] = answers;
        resResults['correctAnswers'] = answersCheck;
        const score = getScore(answers)
        resResults.score = score;
        const text = getScoreText(score);
        resResults['scoreText'] = text;
        resResults.completed = true;
        res.status(201).json(resResults).end();
    } else if (checkComplete === true && answers !== undefined) {
        res.status(201).json(resResults).end();
    }
});

function getCorrectAnswers (data) {
    const correctAnswers = {};
    data.forEach (ques => {
        correctAnswers[ques._id] = ques.correctAnswer.toString();
    }) 
    return correctAnswers;
}

function getMatchedQuestions(_idAttempts) {
    i = 0;
    if (responses.length > 0) {
        for (res of responses) {
            i++;
            const idCheck = (res._id).toString();
            if (_idAttempts === idCheck) {
                return res;
            }
        }
    }
    return ;
}

function getScore(answers) {
    let score = 0;
    for (const answer in answers) {
        for (const correctAnswer in answersCheck) {
            if (answer === correctAnswer && answers[answer] === answersCheck[correctAnswer]) {
                score++;
            }
        }
    }
    return score;
}

function getScoreText(score) {
    if (score < 5) {
        return `Practice more to improve it :D`;
    } else if (score >= 5 && score < 7) {
        return `Good, keep up!`;
    } else if (score >= 7 && score < 9) {
        return 'Well done!';
    } else if (score === 10) {
        return `Perfect!!`;
    }
}

app.listen(port, async () => {
    getData();
    console.log(`Listening to http:/localhost:${port}`);
})
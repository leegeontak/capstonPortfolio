// server.js

const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();
const multer = require("multer");
const path = require("path");
const iconv = require("iconv-lite");
app.use(express.json());
app.use(cors());
app.use(express.static("public"));
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());

// MySQL 연결 설정
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "6191",
    database: "capstone",
});

// MySQL 연결
connection.connect((err) => {
    if (err) {
        console.error("Error connecting to database: " + err.stack);
        return;
    } else {
        console.log("연결됨");
    }
    console.log("Connected to database as id " + connection.threadId);
});

// 회원가입 엔드포인트
app.post("/api/signup", (req, res) => {
    const { userName, userEmail, userPassword, userTel } = req.body;
    console.log("hi");
    // MySQL 쿼리 실행
    connection.query(
        "INSERT INTO user (email,name, password,tel) VALUES (?, ?, ?,?)",
        [userEmail, userName, userPassword, userTel],
        (err, results) => {
            if (err) {
                console.error("Error inserting user: " + err.stack);
                res.status(500).send("Error inserting user");
                return;
            }
            res.status(200).send("User signed up successfully");
        }
    );
});
app.post("/api/login", (req, res) => {
    console.log(res);
    const { loginEmail, loginPassword } = req.body;
    const sql = "SELECT * FROM user WHERE email = ? AND password = ?";
    connection.query(sql, [loginEmail, loginPassword], (err, result) => {
        if (err) {
            console.error("로그인 실패", err);
            res.status(500).json({ message: "로그인 실패" });
        } else {
            if (result.length > 0) {
                console.log("로그인 성공");
                res.status(200).json({ message: "로그인 성공" });
            } else {
                console.log("이메일 또는 비밀번호가 잘못되었습니다.");
                res.status(401).json({
                    message: "이메일 또는 비밀번호가 잘못되었습니다.",
                });
            }
        }
    });
});
app.post("/api/saveReview", (req, res) => {
    const { thumnail, userID, currentDateTime, title, content, newdbSave } =
        req.body;
    const newdbSaveJson = JSON.stringify(newdbSave);
    connection.query(
        "INSERT INTO review (id,thumnail, reviewDate,title,content,reviewObj) VALUES (?, ?, ?,?,?,?)",
        [userID, thumnail, currentDateTime, title, content, newdbSaveJson],
        (err, results) => {
            if (err) {
                console.error("Error inserting user: " + err.stack);
                res.status(500).send("Error inserting user");
                return;
            }
            res.status(200).send("User signed up successfully");
        }
    );
});
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "../capstone/public/images/");
    },
    filename: function (req, file, cb) {
        const originalname = iconv.decode(
            Buffer.from(file.originalname, "binary"),
            "utf8"
        );
        // const originalname = Buffer.from(file.originalname, "latin1").toString(
        //     "utf8"
        // );
        cb(null, "image" + Date.now() + ".jpg"); // 시간과 원본 파일명을 조합하여 파일명을 유니크하게 설정
    },
});

const upload = multer({ storage: storage });

app.post("/upload", upload.array("images", 10), (req, res) => {
    // 'images' 필드에서 최대 10개의 파일을 처리
    try {
        console.log(req.files);
        const fileInfos = req.files.map((file) => ({
            fieldname: file.fieldname,
            originalname: file.originalname,
            encoding: file.encoding,
            mimetype: file.mimetype,
            destination: file.destination,
            filename: file.filename,
            // 한국어가 포함된 파일 경로를 URL 인코딩하여 전달
            path: encodeURI(file.path),
            size: file.size,
        }));
        const fileImageSrc = fileInfos.map((item) => {
            if (item.originalname == "empty") {
                return "";
            } else {
                return item.filename;
            }
        });
        console.log(fileImageSrc);
        // const fileImageSrc = fileInfos.map((item) => item.filename);
        const currentDateTime = req.body.currentDateTime;
        // console.log(typeof currentDateTime);
        const fileImageSrcJson = JSON.stringify(fileImageSrc);
        connection.query(
            "UPDATE review SET reviewImages = ? WHERE reviewDate = ?",
            [fileImageSrcJson, currentDateTime],
            (err, results) => {
                if (err) {
                    console.error("Error inserting user: " + err.stack);
                    res.status(500).send("Error inserting user");
                    return;
                }
                res.status(200).send("User signed up successfully");
            }
        );
    } catch (error) {
        res.status(400).json({
            message: "Image upload failed",
            error: error.message,
        });
    }
});
app.post("/api/showdata", (req, res) => {
    const query = "SELECT * FROM review";
    connection.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching data:", err);
            res.status(500).json({ error: "Failed to fetch data" });
            return;
        }
        res.send(results);
    });
});
app.post("/api/searchword", (req, res) => {
    const query = req.query.query;
    console.log(req.query);

    if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
    }

    connection.query(
        "SELECT * FROM review WHERE title LIKE ? OR content LIKE ? OR JSON_SEARCH(reviewObj, 'one', ?) IS NOT NULL",
        [`%${query}%`, `%${query}%`, `%${query}%`],
        (err, result) => {
            if (err) {
                console.error("Error fetching search results:", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            res.json(result);
        }
    );
});
app.post("/api/getreview", (req, res) => {
    const { id, checked } = req.body;
    const query = "SELECT * FROM review WHERE id = ?";
    if (checked) {
        connection.query(
            "SELECT * FROM review WHERE id = ? ORDER BY CONVERT(reviewDate,UNSIGNED) DESC",
            [id],
            (err, results) => {
                if (err) {
                    console.error("Error fetching data:", err);
                    res.status(500).json({ error: "Failed to fetch data" });
                    return;
                }
                res.send(results);
            }
        );
    } else {
        connection.query(
            "SELECT * FROM review WHERE id = ? ORDER BY CONVERT(reviewDate,UNSIGNED)",
            [id],
            (err, results) => {
                if (err) {
                    console.error("Error fetching data:", err);
                    res.status(500).json({ error: "Failed to fetch data" });
                    return;
                }
                res.send(results);
            }
        );
    }
});
app.post("/api/deletereview", (req, res) => {
    const { reviewDate } = req.body;
    const query = "DELETE FROM review WHERE reviewDate = ?";
    connection.query(query, [reviewDate], (err, results) => {
        if (err) {
            console.error("Error fetching data:", err);
            res.status(500).json({ error: "Failed to fetch data" });
            return;
        }
        res.send(results);
    });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const bcrypt = require('bcryptjs');
const mystr = "I left the table, and when James—whose real n"
// const targetHash = "$2a$10$zvupe/jVlmQJTBI2PeyWBONNd0teF.r7czcpt36lUumANUM9i6z2e";
// for (let num=0; num<=35; num++){

//     console.log((mystr+num).toString());
//     if (bcrypt.compareSync((mystr+num).toString(),targetHash)){
//         console.log(num);
//         console.log("found");
//     }
// }


const originData = mystr + 30;
const saltRounds = 5;
const salt = bcrypt.genSaltSync(saltRounds);
const hash = bcrypt.hashSync(originData, salt);
const roundfake = 30;
const compareResult = bcrypt.compareSync(mystr+roundfake,hash);
console.log(compareResult);
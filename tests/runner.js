import { test, exec } from "uvu";

import "./tagged-template.test.js";

//test.run()
exec().then((v) => console.log({ v }));

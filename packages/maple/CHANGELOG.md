## [0.4.0](https://github.com/NetWin/maple/compare/0.3.0...0.4.0) (2026-10-21)

### 🚀 Features

* **builtins:** pass thisArg to array, Map and Set callbacks ([80e5ccb](https://github.com/NetWin/maple/commit/80e5ccbe96c2951be38225741ff4581346d4eaa7))
* **evaluator:** support this in script functions ([f90237d](https://github.com/NetWin/maple/commit/f90237d7fc75bfc6e459b1ee79c96274c0eb935c))
* **input:** accept data only as a plain object ([88dfd69](https://github.com/NetWin/maple/commit/88dfd6946d3259f7ef674c9653f50dad3c5dba13))
* **json:** give a JSON replacer its holder as this ([d1c1e20](https://github.com/NetWin/maple/commit/d1c1e202fea439b180f02630594efb91237a7a51))
* **json:** give a JSON reviver its holder as this ([7ed2e5f](https://github.com/NetWin/maple/commit/7ed2e5f4492a81e4f262e130a499a1abeb0ef3c9))
* **parse:** cache syntax trees per instance when enabled ([e53f816](https://github.com/NetWin/maple/commit/e53f816cf0392984171f4887fff2c306a78f3658))

### 🩹 Bug Fixes

* **playground:** reject an array context before either engine runs ([f037c65](https://github.com/NetWin/maple/commit/f037c6591105840ebbea87f588b6daa62ea14dbc))

### ⚡ Performance Improvements

* **boundary:** assign new own properties directly in defineOwn ([6728bff](https://github.com/NetWin/maple/commit/6728bfffcd95645efbaa8fcf950754423628b386))
* **input:** convert data keys on first read ([ce33aa2](https://github.com/NetWin/maple/commit/ce33aa201dac20754906068171eae106a5ed422d))

### 📖 Documentation

* **contributing:** update conventional commit instructions ([8cc9c43](https://github.com/NetWin/maple/commit/8cc9c43fdca1bac36ef109b03942a279dccb2dde))

### 🔧 Miscellaneous Chores

* **playground:** add a contact summary script to measure-run ([ae94d6d](https://github.com/NetWin/maple/commit/ae94d6d483b9601ba57e8c6db71b33f1263ecc86))
* **playground:** rename measure-memory to measure-run and add timing ([54e170e](https://github.com/NetWin/maple/commit/54e170e0e0f25adcd2a500febbed961b8e9a1129))

## [0.3.0](https://github.com/NetWin/maple/compare/0.2.1...0.3.0) (2026-10-19)

### 🚀 Features

* **maple:** add Object.seal and Object.isSealed ([05ac326](https://github.com/NetWin/maple/commit/05ac326f80a42b4052e755a6adbd17d5e4fa6f19))
* **maple:** support call, apply and bind ([d6236ff](https://github.com/NetWin/maple/commit/d6236ff4adfe5208c33120fd91265f4dcf316434))

### 🩹 Bug Fixes

* **maple:** accept any function as an entry in Object.fromEntries ([e3bec2d](https://github.com/NetWin/maple/commit/e3bec2d8cb000f946583560a625c85ddd6bac53d))
* **maple:** call the host's array methods past a script's own property ([958bb99](https://github.com/NetWin/maple/commit/958bb99b3260e3b7c16ec46ee4f40b3bb659ae63))
* **maple:** make converting a cyclic error a catchable RangeError ([8b45f9d](https://github.com/NetWin/maple/commit/8b45f9d19c5ef4544e1accf204cef95a556068e2))
* **maple:** refuse deleting a frozen property of a function or error ([d67a864](https://github.com/NetWin/maple/commit/d67a86455f0b9a07d352eca4c36d31aad67caa92))

### 📖 Documentation

* describe the increment branch flow ([ba3c461](https://github.com/NetWin/maple/commit/ba3c461e72f5edfea95c0c8a5a2904e3aec3d9cc))

### 🔄️ Continuous Integration

* merge each release back into increment ([918c227](https://github.com/NetWin/maple/commit/918c22762932a0cf4ccd9c80425fdc5dee9707d1))

## [0.2.1](https://github.com/NetWin/maple/compare/0.2.0...0.2.1) (2026-10-19)

### 🩹 Bug Fixes

* **run:** let scripts reassign data and run global bindings with freeze: false ([42aefbe](https://github.com/NetWin/maple/commit/42aefbe728c7f3e6f28a5b6d164655edc298074f))

## [0.2.0](https://github.com/NetWin/maple/compare/0.1.3...0.2.0) (2026-10-19)

### 🚀 Features

* **run:** let the host opt out of freezing data and run globals ([687c42f](https://github.com/NetWin/maple/commit/687c42f4dbe1f8a0511cb74fefa24cb5164d606f))

## [0.1.3](https://github.com/NetWin/maple/compare/0.1.2...0.1.3) (2026-10-19)

### 🩹 Bug Fixes

* **boundary:** drop functions in host function arguments instead of throwing ([1585178](https://github.com/NetWin/maple/commit/15851781bc10ee53d83d69dfd3c232913ba5ac3f))

## [0.1.2](https://github.com/NetWin/maple/compare/0.1.1...0.1.2) (2026-10-19)

### 🛠️ Code Refactoring

* **release:** ship the docs with the package and add npm keywords ([5d4fda0](https://github.com/NetWin/maple/commit/5d4fda0c16ace3690842e295b7e132a349fa4c46))

### 🔄️ Continuous Integration

* leave the publishing plugins out of the changelog preview ([5c2b8dd](https://github.com/NetWin/maple/commit/5c2b8ddc3061ae70ea06469ba58ecd3eeb0faf2e))
* require a scope in commit messages ([2f0c909](https://github.com/NetWin/maple/commit/2f0c909be4c65a07a58f145dbeeca6932076d15e))

## [0.1.1](https://github.com/NetWin/maple/compare/0.1.0...0.1.1) (2026-10-18)

### 📖 Documentation

* add all the badges ([61899d2](https://github.com/NetWin/maple/commit/61899d2562e000eca00d8f174c1f93084e471a7b))

### 🏗 Dependency Updates

* **deps:** update dependencies ([3b869a4](https://github.com/NetWin/maple/commit/3b869a4d153593cfc13a78d7f09a493474539871))

### 📦 Build System

* **maple:** bundle for a neutral platform ([e9d0695](https://github.com/NetWin/maple/commit/e9d069591bd4bda4f9fac78b1f44dd076658c2af))

### 🔄️ Continuous Integration

* install npm globally for OIDC to work correctly ([85b87ec](https://github.com/NetWin/maple/commit/85b87ecb0a7e36e5bc81f14b750c9fda77a802d5))
* remove NPM_TOKEN as deployment runs with OIDC now ([91475bb](https://github.com/NetWin/maple/commit/91475bb96e9f0755277a646fdedea1c2953e6960))

## [0.1.0](https://github.com/NetWin/maple/compare/0.0.0...0.1.0) (2026-10-18)

### 🚀 Features

* **maple:** add Object.preventExtensions and Object.isExtensible ([eadeac5](https://github.com/NetWin/maple/commit/eadeac598b0c8c6202d0b13079a51a3513d009bd))
* **maple:** add the Maple interpreter ([94eda74](https://github.com/NetWin/maple/commit/94eda7407f5fdf163fdb57941d2efecde499b376))
* **maple:** answer "in" for the methods of a value's type ([b42e35f](https://github.com/NetWin/maple/commit/b42e35fdfcf24b74ba1a2dd6b1f437d41ddd0fe8))
* **maple:** carry the indices of a match made with the d flag ([d50ea30](https://github.com/NetWin/maple/commit/d50ea30c3d19e28bcd31b9964ad010d9663df8fb))
* **maple:** convert Maple's own values to primitives through their class ([97be6fe](https://github.com/NetWin/maple/commit/97be6fe9926ebe9a8dcfda3fe40082d99ff9aa01))
* **maple:** ignore debugger statements and add escape and unescape ([b61d9be](https://github.com/NetWin/maple/commit/b61d9be4af4fe902b070717fa31e270a061154b5))
* **maple:** let scripts add properties to built-ins for the length of a run ([13a968b](https://github.com/NetWin/maple/commit/13a968b3ae8a492f65cb197f016085cc777fd58a))
* **maple:** let scripts add properties to errors, functions and wrappers ([09e5fe8](https://github.com/NetWin/maple/commit/09e5fe8f3d8d6a0283e91fd9c583679a4c399945))
* **maple:** run what js-interpreter runs ([13eb8ed](https://github.com/NetWin/maple/commit/13eb8ed471fe73da4fb611097e0d328a7e3097a0))
* **maple:** support the cause option of the Error constructors ([09c230f](https://github.com/NetWin/maple/commit/09c230fd8a760a2e81cde6617b6ecfb89b495be7))
* **maple:** take a method's receiver from the call ([c1e71ac](https://github.com/NetWin/maple/commit/c1e71acb4fd0e09aad64762bd87251dd4d95da9d))

### 🩹 Bug Fixes

* **maple:** add valueOf to numbers and strings ([ede9d90](https://github.com/NetWin/maple/commit/ede9d9029acc92854dc3ebb83af332801423fb3a))
* **maple:** cap the nesting of values copied from the host ([d5eb307](https://github.com/NetWin/maple/commit/d5eb307a000beb2ae9a3d40498583ab6251e7463))
* **maple:** close the iterator when an iterator helper fails ([02240a7](https://github.com/NetWin/maple/commit/02240a7ca5d00518fac851d59f4b277ad91ef2dc))
* **maple:** close the iterator when take or drop rejects its count ([9c2742a](https://github.com/NetWin/maple/commit/9c2742ab90fefcdf2d334a2472f4bfa6797c2cd0))
* **maple:** convert the limit of split without a separator with ToUint32 ([f8d23b1](https://github.com/NetWin/maple/commit/f8d23b1170fedf7ee84bf377f5b7a71ba02bbd43))
* **maple:** copy uncaught errors to the host without cycles and bounded in size ([590b19e](https://github.com/NetWin/maple/commit/590b19eb921d224abe268b397d74f48682a44750))
* **maple:** count nested errors' text against an uncaught error's budget ([d262f21](https://github.com/NetWin/maple/commit/d262f21174114fc89fd43005fe52f0e504f1acae))
* **maple:** drop constructor keys when a value leaves the sandbox ([c0cfaae](https://github.com/NetWin/maple/commit/c0cfaaee065483c92fa755aec03a074d5216d6da))
* **maple:** give errors thrown inside a conversion a position and a stack ([507f55b](https://github.com/NetWin/maple/commit/507f55b4a2362829c43689c16fcdf2c62aeac148))
* **maple:** give nested runs their own state for built-ins ([8f6229e](https://github.com/NetWin/maple/commit/8f6229ee15daeb8647dd2e69aec7773869f039c5))
* **maple:** give objects without a prototype no Object.prototype behaviour ([e6d0d76](https://github.com/NetWin/maple/commit/e6d0d76658a6a686ca9f2350f8ca3e86a185600d))
* **maple:** hide host exception messages from scripts unless marked with exposed ([5bc3109](https://github.com/NetWin/maple/commit/5bc3109ca60c6214cfec2e6f401dcdd664822687))
* **maple:** keep an error's name and message as assigned and convert them as JavaScript does ([2ee7621](https://github.com/NetWin/maple/commit/2ee76214b116af50b2623e9f63bfc5fec8270ebe))
* **maple:** keep holes as holes in sort and reverse ([42833bf](https://github.com/NetWin/maple/commit/42833bf509ecc1d7734eac63e794c6a18a3ae985))
* **maple:** keep lastIndex on a frozen RegExp ([e851e9f](https://github.com/NetWin/maple/commit/e851e9f55d0f14e118588ba26912a3b334076069))
* **maple:** make Intl TypeErrors in Array.prototype.toLocaleString catchable ([9d43f5d](https://github.com/NetWin/maple/commit/9d43f5d64e899d276f958dd2f20b2c084dd86663))
* **maple:** name a value in an error message without converting it ([7bcfb24](https://github.com/NetWin/maple/commit/7bcfb2486fa8dfc0c74229563ae786eb028e36bb))
* **maple:** name only the root in errors about deeply nested host values ([16b71da](https://github.com/NetWin/maple/commit/16b71dae6fdf6d7f2abcbda58e32897986b3fb47))
* **maple:** read a host exception's name and message defensively ([fb7a1bd](https://github.com/NetWin/maple/commit/fb7a1bdf57b322ddea7cc0c5d6bb416c108d8902))
* **maple:** read each element when the array callback methods reach it ([ac97e1f](https://github.com/NetWin/maple/commit/ac97e1ff0d72c23a03541eeb1e0b9981b0cca8cd))
* **maple:** refuse a RegExp in startsWith, endsWith and includes ([0549dd8](https://github.com/NetWin/maple/commit/0549dd82e718a41cbc4dce266c9f1b2a93acca50))
* **maple:** reject a non-numeric RegExp lastIndex at the boundary ([3fff312](https://github.com/NetWin/maple/commit/3fff3123119e4452815d3b0a5b70d4c8dc8101cf))
* **maple:** report values nested too deep for the boundary as script errors ([9ce371f](https://github.com/NetWin/maple/commit/9ce371f92509ec0924aaa4de3ce375b8498a0cce))
* **maple:** return the element the predicate saw from find and findLast ([405770d](https://github.com/NetWin/maple/commit/405770da8393ec269da9a06d97ef63aa4b3eefe8))
* **maple:** revoke the sandbox handle once the intrinsic has returned ([8496236](https://github.com/NetWin/maple/commit/84962366259dba31c0714cd19a686108e3ad7e71))
* **maple:** run only source text that Maple parses itself ([c06f57e](https://github.com/NetWin/maple/commit/c06f57e5dc2e5f4bdf161618452bb504de7a62e5))
* **maple:** skip a key that for...in deletes before visiting it ([64c6f8e](https://github.com/NetWin/maple/commit/64c6f8e145b978952df725435784e0ce600900ff))
* **maple:** start setYear on an invalid Date from local midnight ([d7675b8](https://github.com/NetWin/maple/commit/d7675b894adbe9f320ec4a963cb3a280bd4ea43b))
* **playground:** read js-interpreter's result on the host so the context cannot shadow it ([2f70094](https://github.com/NetWin/maple/commit/2f70094aed5d08143cec90dbe0e23bb5057c48f4))

### 📖 Documentation

* **ai:** make JavaScript the reference instead of js-interpreter ([8158b0c](https://github.com/NetWin/maple/commit/8158b0cb7584441b6a85311f4f799c38caf54f13))
* cleanup maple documentation ([557272e](https://github.com/NetWin/maple/commit/557272ef6a7ffc52046ee3932254da8bfe85f0da))
* drop any mentions of outdated folder structure in AGENTS.md and spec.md ([8803738](https://github.com/NetWin/maple/commit/8803738880510b97ba5b96326fa63b0fb9b7c51a))
* **maple:** define secure as isolation, not resource limits ([011bcc4](https://github.com/NetWin/maple/commit/011bcc452c62943d845005137bb106b385215067))
* **maple:** say JavaScript instead of "the language" ([8f1cabf](https://github.com/NetWin/maple/commit/8f1cabf3513231f11ef5bb1b565c967d96d08da4))
* **maple:** update README ([bba28e2](https://github.com/NetWin/maple/commit/bba28e2d17d9bcfed73b932432d0199f646bca3b))
* **parity:** group the divergences by whether Maple follows the language ([0791c28](https://github.com/NetWin/maple/commit/0791c288562037d1e4a50a305e1b27e8a50936a5))
* rewrite readmes and add AGENTS.md ([6786c4a](https://github.com/NetWin/maple/commit/6786c4aa391b1c22e7e6f9a7eee382fa9a2e63f0))
* update READMEs ([9a6762c](https://github.com/NetWin/maple/commit/9a6762ce4d3b29b58d68543bcbb14cca1d0b0952))

### 🔧 Miscellaneous Chores

* **playground:** add run limits, stats and inline errors ([1686325](https://github.com/NetWin/maple/commit/16863253982b77be62d1a219d014ef09ae5efbea))
* **playground:** compare Maple with js-interpreter ([7703a3c](https://github.com/NetWin/maple/commit/7703a3c5f0fffc6f03e431731ee5c7fb182c5a26))
* **playground:** return the greeting in the default code ([b492ee3](https://github.com/NetWin/maple/commit/b492ee3a3ca5e1baa997e7439cd964518571a5d1))

### 🛠️ Code Refactoring

* **maple:** give each built-in type a prototype that holds its methods ([a54d14e](https://github.com/NetWin/maple/commit/a54d14e34437d6319ee5c95ab333ed489555bba3))
* **maple:** give every own property of Maple's values JavaScript's attributes ([493b18d](https://github.com/NetWin/maple/commit/493b18d94fa0a5bd85dffb4950e9ece4ed87fd36))
* **maple:** give Maple's own values a base class that holds their properties ([1f37ca1](https://github.com/NetWin/maple/commit/1f37ca1f894c1b5db72e86d025cfa32bb2ead1bd))
* **maple:** restructure array builtin for better readability and discoverability ([c241806](https://github.com/NetWin/maple/commit/c241806f52373a79ce5e9a3001010600674250f7))
* **maple:** restructure boolean builtin for better readability and discoverability ([ee4fd87](https://github.com/NetWin/maple/commit/ee4fd871a2862e35c0f3d247c62f825a08faf281))
* **maple:** restructure date builtin for better readability and discoverability ([ea68b50](https://github.com/NetWin/maple/commit/ea68b5000c71effe1c5d2cb9a0eed20e45640d54))
* **maple:** restructure error builtin for better readability and discoverability ([355cc99](https://github.com/NetWin/maple/commit/355cc99ce53477a4b6da932b5679d54ccc5ddc3a))
* **maple:** restructure function builtin for better readability and discoverability ([a058d53](https://github.com/NetWin/maple/commit/a058d53358aba7efec44582cfaf12b661ac712c0))
* **maple:** restructure iterator builtin for better readability and discoverability ([b76b0a2](https://github.com/NetWin/maple/commit/b76b0a2a744cec8cde8e1f3935adca27dce09072))
* **maple:** restructure json builtin for better readability and discoverability ([4027aa0](https://github.com/NetWin/maple/commit/4027aa06ab4135ebd4f67f7c23b4261429292a59))
* **maple:** restructure map builtin for better readability and discoverability ([05bd0fe](https://github.com/NetWin/maple/commit/05bd0fe54483ec876e5de030667900f2d78e7dfc))
* **maple:** restructure math builtin for better readability and discoverability ([f3b955b](https://github.com/NetWin/maple/commit/f3b955b148224b7e1342b4c6d71eb46d9ac4442b))
* **maple:** restructure number builtin for better readability and discoverability ([4157a7f](https://github.com/NetWin/maple/commit/4157a7fe4412f0b8996dcb7a9ab8e8827e897d81))
* **maple:** restructure object builtin for better readability and discoverability ([6cb88ef](https://github.com/NetWin/maple/commit/6cb88ef94f98fe4a6fecae252ab09ce4daf68a43))
* **maple:** restructure regexp builtin for better readability and discoverability ([9ea2e4e](https://github.com/NetWin/maple/commit/9ea2e4e958a7bf17c952ec2359c0e8aea6fbc471))
* **maple:** restructure set builtin for better readability and discoverability ([59d1583](https://github.com/NetWin/maple/commit/59d15834c07a0bc3e1762be55b57184858bfa7d7))
* **maple:** restructure string builtin for better readability and discoverability ([7895f7d](https://github.com/NetWin/maple/commit/7895f7d35b147f7a84bc38f1497a2c9a1ba4c4a7))
* **maple:** take substr from the host ([45fd612](https://github.com/NetWin/maple/commit/45fd612e57f78f922f9c07975397771b7353c714))

### 🧪 Tests

* **parity:** hold Maple to everything js-interpreter runs ([e116481](https://github.com/NetWin/maple/commit/e116481ded88f247ec2a1d83178bdd08ef4eeff1))
* **parity:** run every case in Node as well ([18b386b](https://github.com/NetWin/maple/commit/18b386b4ccffa3414457b3bb344b76ef48a85900))

### 📦 Build System

* add test:watch script ([13c5d0a](https://github.com/NetWin/maple/commit/13c5d0a3a4cfef8f0ee49cb30482db5830729819))
* **ai:** update Agents.md ([79a53dc](https://github.com/NetWin/maple/commit/79a53dcfb937be510b87412f74bf957fbd5188a9))

### 🔄️ Continuous Integration

* add changelog-preview comments ([046dba9](https://github.com/NetWin/maple/commit/046dba96e0c87a1b2e65024d7d348141a69b3484))
* enable npm publishing ([e68b534](https://github.com/NetWin/maple/commit/e68b5348fd2d78425a3989d7e0c14cf54b7444f4))
* skip npm auth until the first release ([8b8939d](https://github.com/NetWin/maple/commit/8b8939d8c91a57668fac2c0c9318a4a9b361ee1c))
* skip the changelog preview for pull requests from forks ([c7ce28f](https://github.com/NetWin/maple/commit/c7ce28f45161a831d7f689bc2a08f7d76e28dd31))

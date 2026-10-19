Extension { #name : 'sys_implementation' }

{ #category : 'Grail-Initialization' }
sys_implementation >> ___grailCacheTag___ [
	"``<name>-<major><minor>'', the shape CPython uses -- read off the
	values just stored rather than repeated, so a version bump carries."

	| ver |
	ver := self @env0:dynamicInstVarAt: #version.
	^ (self @env0:dynamicInstVarAt: #name) @env0:asString
		@env0:, '-'
		@env0:, (ver @env1:__getitem__: 0) @env0:printString
		@env0:, (ver @env1:__getitem__: 1) @env0:printString

]

{ #category : 'Grail-Initialization' }
sys_implementation >> initialize [
	"PEP 421 required attributes.  The version here is the CPython
	language level Grail emulates (the vendored stdlib and _sre are
	3.14), which is what packages gate features on."

	self @env0:dynamicInstVarAt: #name put: 'grail'.
	self @env0:dynamicInstVarAt: #version put: (tuple @env0:withAll: {3. 14. 0. 'final'. 0}).
	self @env0:dynamicInstVarAt: #hexversion put: 16r030E00F0.
	self @env0:dynamicInstVarAt: #_multiarch put: 'gemstone'.
	"``cache_tag'' NAMES THE BYTECODE-CACHE FILES an implementation would
	write -- ``__pycache__/x.<tag>.pyc'' -- and PEP 421 lets it be None when
	caching does not apply.  Grail's was None, which is defensible on its
	face: nothing here writes a .pyc.

	It was the wrong answer anyway, because the tag is used for PATH
	ARITHMETIC far more than for reading files.  importlib.util
	>> cache_from_source RAISES NotImplementedError on a None tag, so every
	caller that merely wants to KNOW the path got an exception instead of a
	string -- including CPython's own test_reprlib, whose
	_check_path_limitations computes the cached path's LENGTH to decide
	whether to skip on Windows.  It never opens it.  Five LongReprTest cases
	died in that helper, none of them about caching.

	BUILT FROM name AND version rather than written out, so the two cannot
	drift: CPython's shape is ``<name>-<major><minor>'', giving
	``cpython-314'' there and ``grail-314'' here.  Naming Grail honestly
	matters -- a .pyc that claimed to be CPython's would be a file no
	CPython could load and no Grail would write."
	self @env0:dynamicInstVarAt: #cache_tag put: self ___grailCacheTag___

]

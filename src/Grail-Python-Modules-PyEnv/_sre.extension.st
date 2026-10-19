Extension { #name : '_sre' }

{ #category : 'Grail-Built-in Functions' }
_sre >> ascii_iscased: character [
	"_sre.ascii_iscased(character) -> bool"
	^ self @env0:class @env0:callAsciiIscased: character

]

{ #category : 'Grail-Built-in Functions' }
_sre >> ascii_tolower: character [
	"_sre.ascii_tolower(character) -> int"
	^ self @env0:class @env0:callAsciiTolower: character

]

{ #category : 'Grail-Accessors' }
_sre >> CODESIZE [
	^ self @env0:at: #CODESIZE

]

{ #category : 'Grail-Built-in Functions' }
_sre >> compile: pattern _: flags _: code _: groups _: groupindex _: indexgroup [
	"_sre.compile(pattern, flags, code, groups, groupindex, indexgroup)
	-> SrePattern"

	| cPtr |
	cPtr := self @env0:class @env0:callCompile: pattern flags: flags code: code groups: groups groupindex: groupindex indexgroup: indexgroup.
	"Remember the compile arguments so a committed pattern faulted into a
	later session can recompile itself transparently (cPtrAddress)."
	^ SrePattern @env0:newFromCPtr: cPtr
		compileArgs: { pattern. flags. code. groups. groupindex. indexgroup }

]

{ #category : 'Grail-Built-in Functions' }
_sre >> getcodesize [
	"_sre.getcodesize() -> int"
	^ self @env0:class @env0:callGetcodesize

]

{ #category : 'Grail-Initialization' }
_sre >> initialize [
	"Initialize module-level constants."
	self @env0:at: #MAGIC put: 20230612.
	self @env0:at: #CODESIZE put: 4.
	self @env0:at: #MAXREPEAT put: 4294967295.
	self @env0:at: #MAXGROUPS put: 1073741823.

]

{ #category : 'Grail-Accessors' }
_sre >> MAGIC [
	^ self @env0:at: #MAGIC

]

{ #category : 'Grail-Accessors' }
_sre >> MAXGROUPS [
	^ self @env0:at: #MAXGROUPS

]

{ #category : 'Grail-Accessors' }
_sre >> MAXREPEAT [
	^ self @env0:at: #MAXREPEAT

]

{ #category : 'Grail-Built-in Functions' }
_sre >> unicode_iscased: character [
	"_sre.unicode_iscased(character) -> bool"
	^ self @env0:class @env0:callUnicodeIscased: character

]

{ #category : 'Grail-Built-in Functions' }
_sre >> unicode_tolower: character [
	"_sre.unicode_tolower(character) -> int"
	^ self @env0:class @env0:callUnicodeTolower: character

]

Extension { #name : 'PyStatResult' }

{ #category : 'Instance Creation' }
PyStatResult class >> __new__: sequence [
	"``os.stat_result(sequence)''."

	^ self __new__: sequence _: None

]

{ #category : 'Instance Creation' }
PyStatResult class >> __new__: sequence _: aDict [
	"``os.stat_result(sequence, dict)'' -- what an unpickle calls, with the
	pair __reduce__ answers.  CPython's checks and CPython's words."

	| items n names |
	items := [sequence @env0:___pyStarToArray___]
		@env0:on: TypeError do: [:ex |
			ex @env0:return: nil].
	items @env0:isNil ifTrue: [^ TypeError ___signal___: 'constructor requires a sequence'].
	n := items @env0:size.
	n @env0:< 10 ifTrue: [
		^ TypeError ___signal___: 'os.stat_result() takes an at least 10-sequence ('
			@env0:, n @env0:printString @env0:, '-sequence given)'].
	n @env0:> 19 ifTrue: [
		^ TypeError ___signal___: 'os.stat_result() takes an at most 19-sequence ('
			@env0:, n @env0:printString @env0:, '-sequence given)'].
	(aDict == None or: [aDict @env0:isNil]) ifFalse: [
		(aDict @env0:isKindOf: AbstractDictionary) ifFalse: [
			^ TypeError ___signal___: 'os.stat_result() takes a dict as second arg, if any'].
		"A key that is not a named-only field, or names one the sequence
		already filled, is refused (3.13+)."
		names := PyStatResult @env0:___namedOnlyFields___.
		aDict @env0:keysDo: [:k | | i |
			i := names @env0:indexOf: ((k @env0:isKindOf: CharacterCollection)
				ifTrue: [k @env0:asSymbol] ifFalse: [nil]).
			(i @env0:= 0 or: [i @env0:+ 10 @env0:<= n]) ifTrue: [
				^ TypeError ___signal___: 'os.stat_result() got duplicate or unexpected field name(s)']]].
	^ self @env0:___sequence___: items named: aDict

]

{ #category : 'Grail-Filesystem' }
PyStatResult >> ___gsFileStat___ [
	"The wrapped GsFileStat, for Smalltalk callers wanting a field this does
	not translate (isDirectory)."

	^ self @env0:dynamicInstVarAt: #'___gsFileStat___'

]

{ #category : 'Grail-Pickling' }
PyStatResult >> __reduce__ [
	"CPython's structseq reduction: ``(os.stat_result, (the tuple, {the
	named-only fields}))'', which __new__:_: above reverses."

	| d |
	"By name: dict.gs files in after this one."
	d := (Python @env0:at: #PyDict) @env0:new.
	PyStatResult @env0:___namedOnlyFields___ @env0:do: [:name |
		d @env0:at: name @env0:asString put: (self @env0:dynamicInstVarAt: name)].
	^ tuple @env0:with: PyStatResult
		with: (tuple @env0:with: (tuple @env0:withAll: self) with: d)

]

{ #category : 'Grail-String Representation' }
PyStatResult >> __repr__ [
	"CPython's: ``os.stat_result(st_mode=..., ..., st_ctime=...)'' over the ten
	tuple fields, the three times as the ints the tuple holds."

	| ws names |
	names := #('st_mode' 'st_ino' 'st_dev' 'st_nlink' 'st_uid' 'st_gid' 'st_size'
		'st_atime' 'st_mtime' 'st_ctime').
	ws := WriteStream @env0:on: Unicode7 @env0:new.
	ws @env0:nextPutAll: 'os.stat_result('.
	1 @env0:to: 10 @env0:do: [:i |
		i @env0:> 1 ifTrue: [ws @env0:nextPutAll: ', '].
		ws @env0:nextPutAll: (names @env0:at: i).
		ws @env0:nextPut: $=.
		ws @env0:nextPutAll: ((self @env0:at: i) __repr__) @env0:asString].
	ws @env0:nextPut: $).
	^ ws @env0:contents

]

{ #category : 'Grail-Accessors' }
PyStatResult >> st_dev [
	^ self @env0:at: 3

]

{ #category : 'Grail-Accessors' }
PyStatResult >> st_gid [
	^ self @env0:at: 6

]

{ #category : 'Grail-Accessors' }
PyStatResult >> st_ino [
	^ self @env0:at: 2

]

{ #category : 'Grail-Accessors' }
PyStatResult >> st_mode [
	^ self @env0:at: 1

]

{ #category : 'Grail-Accessors' }
PyStatResult >> st_nlink [
	^ self @env0:at: 4

]

{ #category : 'Grail-Accessors' }
PyStatResult >> st_size [
	^ self @env0:at: 7

]

{ #category : 'Grail-Accessors' }
PyStatResult >> st_uid [
	^ self @env0:at: 5

]

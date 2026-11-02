Extension { #name : 'PyStatResult' }

{ #category : 'Instance Creation' }
PyStatResult class >> __new__: sequence [
	"``os.stat_result(sequence)'' -- the struct sequence constructor's, as
	every struct sequence's is (PyStructSequence class >> __new__:)."

	^ super __new__: sequence

]

{ #category : 'Instance Creation' }
PyStatResult class >> __new__: sequence _: aDict [
	"``os.stat_result(sequence, dict)'' -- what an unpickle calls, with the
	pair __reduce__ answers.  The struct sequence constructor's checks and
	words, which used to be copied here (PyStructSequence class >>
	__new__:_:)."

	^ super __new__: sequence _: aDict

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

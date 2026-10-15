Extension { #name : '_shimtest' }

{ #category : 'Grail-Initialization' }
_shimtest >> initialize [
	"No-op — all methods are real fast-path methods."

]

{ #category : 'Grail-Built-in Functions' }
_shimtest >> test_bool_not: x [
	^ self @env0:class @env0:callTestBoolNot: x

]

{ #category : 'Grail-Built-in Functions' }
_shimtest >> test_bytes_len: b [
	^ self @env0:class @env0:callTestBytesLen: b

]

{ #category : 'Grail-Built-in Functions' }
_shimtest >> test_error [
	^ self @env0:class @env0:callTestError

]

{ #category : 'Grail-Built-in Functions' }
_shimtest >> test_float: x [
	^ self @env0:class @env0:callTestFloat: x

]

{ #category : 'Grail-Built-in Functions' }
_shimtest >> test_int: n [
	^ self @env0:class @env0:callTestInt: n

]

{ #category : 'Grail-Built-in Functions' }
_shimtest >> test_list_insert: aList _: idx _: val [
	^ self @env0:class @env0:callTestListInsert: aList index: idx value: val

]

{ #category : 'Grail-Built-in Functions' }
_shimtest >> test_list_modify: aList _: val [
	^ self @env0:class @env0:callTestListModify: aList value: val

]

{ #category : 'Grail-Built-in Functions' }
_shimtest >> test_list_sum: n [
	^ self @env0:class @env0:callTestListSum: n

]

{ #category : 'Grail-Built-in Functions' }
_shimtest >> test_none [
	^ self @env0:class @env0:callTestNone

]

{ #category : 'Grail-Built-in Functions' }
_shimtest >> test_silent_raise: aDict _: aKey [
	^ self @env0:class @env0:callTestSilentRaise: aDict key: aKey

]

{ #category : 'Grail-Built-in Functions' }
_shimtest >> test_string_len: s [
	^ self @env0:class @env0:callTestStringLen: s

]

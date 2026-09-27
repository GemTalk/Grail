! ------------------- Superclass check
run
tuple ifNil: [self error: 'tuple is not defined. Check file ordering.'].
%

! ------- PyStatResult (the os.stat_result CPython answers)
expectvalue /Class
doit
tuple subclass: 'PyStatResult'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyStatResult comment:
'The object ``os.stat()'' / ``os.lstat()'' answer -- CPython''s os.stat_result.

os.stat used to hand back the raw GsFileStat.  That carries every field, but
under GemStone names (``size'', ``mtimeUtcSeconds'', ``mode'', ...), so Python
code reading the documented ``st_size'' / ``st_mtime'' got an AttributeError.
It is not a theoretical gap: linecache.updatecache does

    size, mtime = stat.st_size, stat.st_mtime

on every source-file lookup, and django''s session and file-storage backends
read st_mtime / st_gid.

CPython does not expose an OS struct either -- os.stat answers its own
stat_result -- so wrapping is the faithful shape as well as the compatible one.
Fields are stored as dynamic instVars named exactly as the Python attributes and
registered in ___pythonValueAttrs___, so ``st.st_size'' reads the VALUE rather
than a BoundMethod wrapping an accessor.

It is a STRUCT SEQUENCE, as CPython''s is: a tuple of the ten POSIX fields
(st_mode, st_ino, st_dev, st_nlink, st_uid, st_gid, st_size, then the three
times as ints), so ``st[stat.ST_MTIME]'', unpacking, equality with a tuple and
pickling all work, with the named-only fields -- the float times, the _ns
triple, st_blksize / st_blocks / st_rdev -- as attributes beside it.  That is
CPython''s Linux layout (19 fields); macOS adds st_flags / st_gen /
st_birthtime, which GsFileStat does not report.  It used to be a plain object
with attributes only, which could not be indexed, compared or pickled
(test_pickle''s test_structseq).

Times are whole seconds: GsFileStat exposes ``mtimeUtcSeconds'' and friends, so
the float times have no fractional part and the _ns ones are the seconds
scaled.  Every consumer here uses them for change detection (linecache''s cache
validity, Django''s session expiry), which whole seconds serve.
'
%

expectvalue /Class
doit
PyStatResult category: 'Grail-Filesystem'
%

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
PyStatResult removeAllMethods.
PyStatResult class removeAllMethods.
PyStatResult removeAllMethods: 1.
PyStatResult class removeAllMethods: 1.
%

set compile_env: 0

category: 'Instance Creation'
classmethod: PyStatResult
on: aGsFileStat
	"Wrap a GsFileStat, translating each field to its CPython attribute name.
	Answers nil for nil so a caller can pass a failed stat straight through."

	| inst |
	aGsFileStat isNil ifTrue: [^ nil].
	inst := self ___sequence___: {
			aGsFileStat mode. aGsFileStat ino. aGsFileStat dev. aGsFileStat nlink.
			aGsFileStat uid. aGsFileStat gid. aGsFileStat size.
			aGsFileStat atimeUtcSeconds. aGsFileStat mtimeUtcSeconds. aGsFileStat ctimeUtcSeconds.
			aGsFileStat atimeUtcSeconds asFloat. aGsFileStat mtimeUtcSeconds asFloat.
			aGsFileStat ctimeUtcSeconds asFloat.
			"CPython also exposes the _ns triple; whole seconds scaled is honest
			and keeps arithmetic on them integral."
			aGsFileStat atimeUtcSeconds * 1000000000.
			aGsFileStat mtimeUtcSeconds * 1000000000.
			aGsFileStat ctimeUtcSeconds * 1000000000.
			aGsFileStat blksize. aGsFileStat blocks. aGsFileStat rdev }
		named: nil.
	"Kept so Smalltalk callers that already have a GsFileStat in hand are not
	forced to re-stat; not a Python attribute."
	inst dynamicInstVarAt: #'___gsFileStat___' put: aGsFileStat.
	^ inst
%

category: 'Instance Creation'
classmethod: PyStatResult
___sequence___: anArray named: aDictOrNil
	"CPython's structseq_new, for an Array already checked to hold between
	n_sequence_fields and n_fields items.  The first ten are the tuple; any
	more fill the named-only fields in order, then aDictOrNil fills the rest by
	name, and a field still unset is None -- except the three float times,
	which posixmodule's statresult_new fills from their int slots, so
	``os.stat_result(range(10)).st_mtime'' is 8, not None."

	| inst names none |
	inst := self withAll: (anArray copyFrom: 1 to: 10).
	names := self ___namedOnlyFields___.
	none := System myUserProfile symbolList objectNamed: #'None'.
	names doWithIndex: [:name :i | | v |
		v := anArray size >= (10 + i)
			ifTrue: [anArray at: 10 + i]
			ifFalse: [(aDictOrNil isNil or: [aDictOrNil == none])
				ifTrue: [none]
				ifFalse: [aDictOrNil @env1:get: name asString _: none]].
		(i <= 3 and: [v == none]) ifTrue: [v := inst at: 7 + i].
		inst dynamicInstVarAt: name put: v].
	^ inst
%

category: 'Instance Creation'
classmethod: PyStatResult
___namedOnlyFields___
	"The fields past the tuple, in CPython's (Linux) order."

	^ #(#'st_atime' #'st_mtime' #'st_ctime' #'st_atime_ns' #'st_mtime_ns'
		#'st_ctime_ns' #'st_blksize' #'st_blocks' #'st_rdev')
%

category: 'Instance Creation'
classmethod: PyStatResult
___sequenceNames___
	"The NAMED tuple fields; the three int times after them are unnamed, as in
	CPython, and read by index only."

	^ #(#'st_mode' #'st_ino' #'st_dev' #'st_nlink' #'st_uid' #'st_gid' #'st_size')
%

category: 'Grail-Python Attribute Hook'
classmethod: PyStatResult
___pythonValueAttrs___
	"Every st_* field is a VALUE attribute, so a read answers the number rather
	than a BoundMethod wrapping the selector."

	^ IdentitySet new
		addAll: self ___sequenceNames___;
		addAll: self ___namedOnlyFields___;
		"Inherited from tuple, which lists it -- see struct_time's copy."
		add: #'__dict__';
		yourself
%

set compile_env: 1

category: 'Instance Creation'
classmethod: PyStatResult
__new__: sequence
	"``os.stat_result(sequence)''."

	^ self __new__: sequence _: None
%

category: 'Instance Creation'
classmethod: PyStatResult
__new__: sequence _: aDict
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
%

category: 'Grail-Accessors'
method: PyStatResult
st_mode
	^ self @env0:at: 1
%

category: 'Grail-Accessors'
method: PyStatResult
st_ino
	^ self @env0:at: 2
%

category: 'Grail-Accessors'
method: PyStatResult
st_dev
	^ self @env0:at: 3
%

category: 'Grail-Accessors'
method: PyStatResult
st_nlink
	^ self @env0:at: 4
%

category: 'Grail-Accessors'
method: PyStatResult
st_uid
	^ self @env0:at: 5
%

category: 'Grail-Accessors'
method: PyStatResult
st_gid
	^ self @env0:at: 6
%

category: 'Grail-Accessors'
method: PyStatResult
st_size
	^ self @env0:at: 7
%

category: 'Grail-Filesystem'
method: PyStatResult
___gsFileStat___
	"The wrapped GsFileStat, for Smalltalk callers wanting a field this does
	not translate (isDirectory)."

	^ self @env0:dynamicInstVarAt: #'___gsFileStat___'
%

category: 'Grail-Pickling'
method: PyStatResult
__reduce__
	"CPython's structseq reduction: ``(os.stat_result, (the tuple, {the
	named-only fields}))'', which __new__:_: above reverses."

	| d |
	"By name: dict.gs files in after this one."
	d := (Python @env0:at: #PyDict) @env0:new.
	PyStatResult @env0:___namedOnlyFields___ @env0:do: [:name |
		d @env0:at: name @env0:asString put: (self @env0:dynamicInstVarAt: name)].
	^ tuple @env0:with: PyStatResult
		with: (tuple @env0:with: (tuple @env0:withAll: self) with: d)
%

category: 'Grail-String Representation'
method: PyStatResult
__repr__
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
%

set compile_env: 0

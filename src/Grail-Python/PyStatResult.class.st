"The object ``os.stat()' / ``os.lstat()' answer -- CPython's os.stat_result.

os.stat used to hand back the raw GsFileStat.  That carries every field, but
under GemStone names (``size', ``mtimeUtcSeconds', ``mode', ...), so Python
code reading the documented ``st_size' / ``st_mtime' got an AttributeError.
It is not a theoretical gap: linecache.updatecache does

    size, mtime = stat.st_size, stat.st_mtime

on every source-file lookup, and django's session and file-storage backends
read st_mtime / st_gid.

CPython does not expose an OS struct either -- os.stat answers its own
stat_result -- so wrapping is the faithful shape as well as the compatible one.
Fields are stored as dynamic instVars named exactly as the Python attributes and
registered in ___pythonValueAttrs___, so ``st.st_size' reads the VALUE rather
than a BoundMethod wrapping an accessor.

It is a STRUCT SEQUENCE, as CPython's is: a tuple of the ten POSIX fields
(st_mode, st_ino, st_dev, st_nlink, st_uid, st_gid, st_size, then the three
times as ints), so ``st[stat.ST_MTIME]', unpacking, equality with a tuple and
pickling all work, with the named-only fields -- the float times, the _ns
triple, st_blksize / st_blocks / st_rdev -- as attributes beside it.  That is
CPython's Linux layout (19 fields); macOS adds st_flags / st_gen /
st_birthtime, which GsFileStat does not report.  It used to be a plain object
with attributes only, which could not be indexed, compared or pickled
(test_pickle's test_structseq).

Times are whole seconds: GsFileStat exposes ``mtimeUtcSeconds' and friends, so
the float times have no fractional part and the _ns ones are the seconds
scaled.  Every consumer here uses them for change detection (linecache's cache
validity, Django's session expiry), which whole seconds serve.

"
Class {
	#name : 'PyStatResult',
	#superclass : 'tuple',
	#category : 'Grail-Filesystem'
}

{ #category : 'Instance Creation' }
PyStatResult class >> ___namedOnlyFields___ [
	"The fields past the tuple, in CPython's (Linux) order."

	^ #(#'st_atime' #'st_mtime' #'st_ctime' #'st_atime_ns' #'st_mtime_ns'
		#'st_ctime_ns' #'st_blksize' #'st_blocks' #'st_rdev')

]

{ #category : 'Grail-Python Attribute Hook' }
PyStatResult class >> ___pythonValueAttrs___ [
	"Every st_* field is a VALUE attribute, so a read answers the number rather
	than a BoundMethod wrapping the selector."

	^ IdentitySet new
		addAll: self ___sequenceNames___;
		addAll: self ___namedOnlyFields___;
		"Inherited from tuple, which lists it -- see struct_time's copy."
		add: #'__dict__';
		yourself

]

{ #category : 'Instance Creation' }
PyStatResult class >> ___sequence___: anArray named: aDictOrNil [
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

]

{ #category : 'Instance Creation' }
PyStatResult class >> ___sequenceNames___ [
	"The NAMED tuple fields; the three int times after them are unnamed, as in
	CPython, and read by index only."

	^ #(#'st_mode' #'st_ino' #'st_dev' #'st_nlink' #'st_uid' #'st_gid' #'st_size')

]

{ #category : 'Instance Creation' }
PyStatResult class >> on: aGsFileStat [
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

]

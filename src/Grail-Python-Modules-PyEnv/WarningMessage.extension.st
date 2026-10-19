Extension { #name : 'WarningMessage' }

{ #category : 'Grail-Printing' }
WarningMessage >> __repr__ [
	"CPython's format, which tests do print on failure."

	^ '{message : ' @env0:, message @env1:__repr__ @env0:,
		', category : ' @env0:, category @env0:name @env0:asString @env0:,
		', filename : ' @env0:, filename @env1:__str__ @env0:,
		', lineno : ' @env0:, lineno @env1:__str__ @env0:, '}'

]

{ #category : 'Grail-Printing' }
WarningMessage >> __str__ [
	^ self __repr__

]

{ #category : 'Grail-Attributes' }
WarningMessage >> category [
	"The warning's class."

	^ category

]

{ #category : 'Grail-Attributes' }
WarningMessage >> file [
	"Always None here: Grail writes warnings to the Transcript, so there is no
	per-warning file object to record."

	^ file

]

{ #category : 'Grail-Attributes' }
WarningMessage >> filename [
	^ filename

]

{ #category : 'Grail-Attributes' }
WarningMessage >> line [
	"Always None: the source LINE at the warn() call site.  CPython reads it
	from linecache using filename/lineno, which Grail does not track for a
	warning's origin."

	^ line

]

{ #category : 'Grail-Attributes' }
WarningMessage >> lineno [
	^ lineno

]

{ #category : 'Grail-Attributes' }
WarningMessage >> message [
	"The Warning INSTANCE -- str() of it is the text."

	^ message

]

{ #category : 'Grail-Attributes' }
WarningMessage >> source [
	"Always None: the object that emitted a ResourceWarning, which Grail has
	no equivalent for."

	^ source

]

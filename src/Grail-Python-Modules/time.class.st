"Python time module - wall-clock, monotonic, and sleep primitives
backed by GemStone DateTime + Delay.

Notes:
  * Smalltalk DateTime stores year + dayOfYear + msAfterMidnight, so
    sub-second resolution comes through.
  * time.time() and time.monotonic() are both wall-clock derived; the
    distinction CPython draws (monotonic guarantees no rewind) is not
    enforced here.  Fine for itsdangerous timestamping and Werkzeug
    request timing; if you depend on strict monotonicity, sample once
    and compare deltas only.
  * sleep() uses GemStone Delay, which schedules at the VM level."
Class {
	#name : 'time',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
time class >> ___epochDaysForYear___: y _month: m _day: d [
	"Days since 1970-01-01 for a civil date; timezone-free."

	^ (Date newDay: d monthNumber: m year: y) asDays - time ___unixEpochDays___

]

{ #category : 'Grail-Private' }
time class >> ___epochSecondsFromGmtOf___: dt [
	"Whole Unix-epoch seconds for the instant `dt`, read through its *Gmt
	accessors and converted with pure civil-calendar arithmetic (see
	___unixEpochDays___ for why not asSeconds)."

	^ (time ___epochDaysForYear___: dt yearGmt _month: dt monthGmt _day: dt dayOfMonthGmt)
		* 86400
		+ (dt hourGmt * 3600)
		+ (dt minuteGmt * 60)
		+ dt secondGmt

]

{ #category : 'Grail-Private' }
time class >> ___substituteMicroseconds___: fmt _: micros [
	"Expand the %f directive to 6-digit zero-padded microseconds BEFORE
	handing the format to the struct_time formatter.  struct_time has no
	sub-second field, so %f cannot be resolved there -- CPython's
	datetime.strftime runs the same pre-pass.  The scan steps over whole
	directives so an escaped ``%%f'' keeps its literal ``f'', and a lone
	trailing ``%'' is passed through untouched.

	(Named `fmt', not `format': ``format'' is already declared as a
	global -- Python's builtin -- and shadowing it is a compile error.)"

	| ws i sz us c |
	us := micros printString.
	[us size < 6] whileTrue: [us := '0' , us].
	ws := WriteStream on: Unicode7 new.
	i := 1.
	sz := fmt size.
	[i <= sz] whileTrue: [
		c := fmt at: i.
		((c = $%) and: [i < sz])
			ifTrue: [
				(fmt at: i + 1) = $f
					ifTrue: [ws nextPutAll: us]
					ifFalse: [ws nextPut: c; nextPut: (fmt at: i + 1)].
				i := i + 2]
			ifFalse: [
				ws nextPut: c.
				i := i + 1]].
	^ ws contents

]

{ #category : 'Grail-Private' }
time class >> ___unixEpochDays___ [
	"Date>>asDays for 1970-01-01, the anchor for all epoch<->civil
	conversions here.

	Epoch math deliberately goes through Date (pure civil-calendar day
	counting, no timezone) rather than DateTime>>asSeconds.  asSeconds
	bakes in the gem's STANDARD UTC offset, so the difference between two
	asSeconds values that straddle a DST boundary is off by the DST shift
	-- e.g. with the default US/Pacific zone, `DateTime now asSeconds -
	(DateTime newGmtWithYear: 1970 ...) asSeconds' ran a full hour ahead
	of the true Unix epoch every summer, which is what made time.time()
	(and everything derived from it) wrong half the year."

	^ 25202

]

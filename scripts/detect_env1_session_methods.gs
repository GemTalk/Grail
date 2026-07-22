! ===============================================================================
! Probe: does this GemStone build support env-1 session methods natively (MR #6)?
! ===============================================================================
! Prints exactly one of:
!     GRAIL_MR6=yes   -- GemStone MR #6 ("Support session methods in environments
!                        other than 0") is present; no Grail compile-path patch
!                        is needed.
!     GRAIL_MR6=no    -- pre-MR#6 build; Grail must patch the env-1 compile path
!                        (see scripts/session_methods_env1_base_40.gs).
!
! Marker: GsPackagePolicy>>permitSessionMethodFor:selector:environmentId: -- the
! env-AWARE routing predicate that MR #6 adds.  Stock pre-MR#6 4.0 has only the
! 2-arg permitSessionMethodFor:selector:, and Grail's own base patches (37/40)
! never add the 3-arg form, so its presence uniquely indicates native MR #6.
! (Verified true on a 4.0 + MR #6 build; false on stock 4.0 / 3.7.x.)
!
! Read-only.  Logs in as SystemUser (like the sibling base scripts) so it works
! regardless of which user ./.topazini selects; the stone comes from .topazini.
! ===============================================================================

set user SystemUser pass swordfish
iferr 1 stk
iferr 2 exit 1
login

run
(GsPackagePolicy canUnderstand: #'permitSessionMethodFor:selector:environmentId:')
  ifTrue:  [ GsFile stdout nextPutAll: 'GRAIL_MR6=yes'; lf; flush ]
  ifFalse: [ GsFile stdout nextPutAll: 'GRAIL_MR6=no';  lf; flush ].
true
%

logout

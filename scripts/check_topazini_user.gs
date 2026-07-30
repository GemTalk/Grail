! ===============================================================================
! Probe: can the ./.topazini user log in at all?
! ===============================================================================
! Prints  GRAIL_TOPAZINI_USER=<userId>  on a successful login, and NOTHING if the
! login fails (missing user, wrong password, stone down).
!
! install_base.sh runs this BEFORE its first user-scoped capability probe, because
! a login failure there is otherwise indistinguishable from a capability answer of
! "no" -- and the two have opposite consequences.
!
! The failure mode this prevents: on a FRESH extent the per-user login accounts do
! not exist yet (scripts/create_claude_users.gs creates them).  Both
! detect_modern_kernel.gs and detect_env1_restricted_classes.gs log in as the
! .topazini user, so both print nothing, so install_base.sh reads "not yes" and
! silently drops to the LEGACY tier -- filing all six kernel-extension files as
! shared SystemUser methods.  On a modern kernel that is exactly the wrong answer:
! it re-creates the shared base the per-user layer exists to avoid, and every
! subsequent per-user ./install.sh then dies with SecurityError 2116 clearing a
! policy-1 method dictionary.  Silent mis-tiering, from a missing account.
!
! Hence: fail loudly and early instead.
! ===============================================================================

iferr 1 stk
iferr 2 stk
login

run
GsFile stdout
	nextPutAll: 'GRAIL_TOPAZINI_USER=';
	nextPutAll: System myUserProfile userId asString;
	lf; flush.
true
%

logout

# User Story

As a BuggyBoard user,
I want to delete bugs,
So that I can remove bugs that are incorrect or no longer needed.


# Design

- The "Edit bug" modal should have a "delete" button.
- Clicking the "delete" button opens a confirmation modal; it must not delete
  the bug immediately.
- The confirmation modal identifies the bug being deleted and offers explicit
  "confirm delete" and "cancel" actions.
- Confirming deletion removes the bug from the database, closes the
  confirmation and edit modals, and removes the bug from the board.
- Canceling the confirmation modal closes it and returns to the edit modal
  without changing or deleting the bug.
- The confirmation modal follows the shared modal behavior in
  `specs/design/theme.md`: its X and Escape key perform the same action as
  cancel.


# Acceptance Criteria

Scenario: Edit bug modal displays a delete button
  Given the user is authenticated into the app
  And the user is on the board page
  And there are bugs in the database
  When the user opens the edit modal for a bug
  Then the modal displays a delete button

Scenario: Clicking delete requests confirmation without deleting the bug
  Given the user is authenticated into the app
  And the user is on the board page
  And there are bugs in the database
  When the user opens the edit modal for a bug
  And the user clicks the delete button
  Then a confirmation modal is displayed identifying the selected bug
  And the confirmation modal has a confirm-delete action and a cancel action
  And the bug remains in the database and on the board
  And no delete request has been sent

Scenario: Canceling deletion leaves the bug unchanged
  Given the user is authenticated into the app
  And the user is on the board page
  And there are bugs in the database
  And the confirmation modal is displayed for a selected bug
  When the user cancels the confirmation
  Then the confirmation modal is closed
  And the edit modal remains open for the selected bug
  And the bug remains unchanged in the database and on the board
  And no delete request has been sent

Scenario: Closing the delete confirmation cancels deletion
  Given the user is authenticated into the app
  And the user is on the board page
  And there are bugs in the database
  And the confirmation modal is displayed for a selected bug
  When the user clicks the confirmation modal's X or presses Escape
  Then the confirmation modal is closed
  And the edit modal remains open for the selected bug
  And the bug remains unchanged in the database and on the board
  And no delete request has been sent

Scenario: Confirming deletion removes the selected bug
  Given the user is authenticated into the app
  And the user is on the board page
  And there are bugs in the database
  And the confirmation modal is displayed for a selected bug
  When the user confirms deletion
  Then the bug is removed from the database
  And the confirmation and edit modals are closed
  And the board no longer displays that bug

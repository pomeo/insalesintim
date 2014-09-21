$(document).ready(function() {
  var modalok = $.UIkit.modal("#modaluploadok");
  var modalnotok = $.UIkit.modal("#modaluploadnotok");
  $("#upload").submit(function() {
    $(this).ajaxSubmit({
      success: function (response) {
        if (response == 'success') {
          modalok.show();
        } else {
          modalnotok.show();
        }
      }
    });
    return false;
  });
});
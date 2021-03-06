$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        if (settings.type === "POST" && !this.crossDomain) {
            xhr.setRequestHeader("X-CSRFToken", $.cookie("csrftoken"));
        }
    }
});

var CropperView = Class.extend({

    el: null,
    url: null,
    coordinates: null,

    init: function(data) {
        this.data = data;
        this.url = data.url;
        this.template = _.template([
            "<div class='crop-anywhere'>",
                "<img src=\"<%= image %>\" />",
                "<button class=\"save-crop\">Save Crop</button>",
                "<button class=\"remove-crop\">Remove Crop</button>",
            "</div>"
        ].join(""));

        this.coordinates = this.data.coordinates;

    },

    /**
     * Call the API again and reshow the element.
     */
    reload: function() {
        if (this.$el.not(":visible")) {
            $.get(this.url, function(resp){
                this.init(resp);
                this.$el.show();
                
            }.bind(this));
        }
    },

    setupEvents: function() {
        this.$el.on("click", ".save-crop", this.save.bind(this));
        this.$el.on("click", ".remove-crop", this.delete.bind(this));
    },

    getProportion: function() {
        return this.img.width / this.data.dimensions[0];
    },

    recordCoordinates: function(coords) {

        proportion = this.getProportion();

        // Set Crop
        var crop = [coords.x, coords.y, coords.x2, coords.y2];
        for (var i = crop.length - 1; i >= 0; i--) {
            crop[i] = Math.round(crop[i] * proportion);
        }

        crop = [coords.x, coords.y, coords.x + coords.w, coords.y + coords.h];

        this.coordinates = _.map(crop, function(i){
            return Math.round(i * (1 / proportion));
        });
    },

    getCoordinates: function() {
        proportion = this.getProportion();
        var points = _.map(this.data.coordinates.split(","), function(point) {
            return Math.round(parseInt(point, 10) * proportion);
        });
        return points;
    },

    render: function() {
        this.$el = $(this.template({
            image: this.data.image
        }));
        this.$el.find("div").css({
            maxWidth: "100%"
        });

        this.img = this.$el.find("img")[0];
        this.img.onload = function(img) {
            var params = {
                onChange: this.recordCoordinates.bind(this),
                onSelect: this.recordCoordinates.bind(this)
            };
            if (this.data.coordinates) {
                params.setSelect = this.getCoordinates();
            }
            $(img).Jcrop(params);
            this.jcrop = $(this.img).data().Jcrop;
        }.bind(this, this.img);

        this.setupEvents();

        return this.$el;
    },

    /**
     * Save changes
     */
    save: function() {
        if (this.coordinates) {
            var coords = this.coordinates;
            if (_.isArray(this.coordinates)) {
                coords = coords.join(",");
            }
            var data = "crop="+coords;
            $.post(this.data.url, data);
        }
        this.remove();
        return false;
    },

    /**
     * Unset the crop
     */
    delete: function() {
        this.jcrop.release();
        var data = "delete=1";
        $.post(this.data.url, data);
        this.remove();
        return false;
    },

    /**
     * Hide the widget
     */
    remove: function() {
        this.$el.hide();
    }
});


$(document).on("click", ".crop-anywhere[data-crop-url]", function(e) {

    var $btn = $(e.target);

    // If this is already up, don't reload it.
    if ($btn.data().cropper !== undefined) {
        $btn.data().cropper.reload();
        return false;
    }

    var url = $btn.attr("data-crop-url");
    var cropping_wrapper = $btn.attr("data-crop-container");
    $.get(url, function(resp) {
        var view = new CropperView(resp);
        if (cropping_wrapper) {
            $(cropping_wrapper).html(view.render());
        } else {
            $btn.after(view.render());
        }
        $btn.data().cropper = view;
    });
    return false;
});

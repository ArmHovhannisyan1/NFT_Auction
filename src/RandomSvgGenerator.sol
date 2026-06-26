// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

library RandomSvgGenerator {
    using Strings for uint256;

    function generateRawSvg(uint256 tokenId) internal pure returns (string memory) {
        uint256 bgColorIdx = uintRandom(tokenId, "BACKGROUND", getColors().length);
        uint256 shapeColorIdx = uintRandom(tokenId, "SHAPE_COLOR", getColors().length);

        if (bgColorIdx == shapeColorIdx) {
            shapeColorIdx = (shapeColorIdx + 1) % getColors().length;
        }

        uint256 cx = uintRandom(tokenId, "COORD_X", 160) + 40;
        uint256 cy = uintRandom(tokenId, "COORD_Y", 160) + 40;
        uint256 r = uintRandom(tokenId, "RADIUS", 30) + 15;

        string memory svgString = string(
            abi.encodePacked(
                "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240' width='100%' height='100%'>",
                "<rect width='240' height='240' fill='",
                getColors()[bgColorIdx],
                "'/>",
                "<circle cx='",
                cx.toString(),
                "' cy='",
                cy.toString(),
                "' r='",
                r.toString(),
                "' fill='",
                getColors()[shapeColorIdx],
                "'/>",
                "<text x='120' y='220' fill='#FFFFFF' font-size='16' font-family='sans-serif' text-anchor='middle'>NFT #",
                tokenId.toString(),
                "</text>",
                "</svg>"
            )
        );

        return svgString;
    }

    function uintRandom(uint256 tokenId, string memory salt, uint256 max) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(tokenId, salt))) % max;
    }

    function getColors() internal pure returns (string[8] memory) {
        return ["#FF5733", "#33FF5 green7", "#3357FF", "#F3FF33", "#FF33F3", "#33FFF0", "#FFA500", "#800080"];
    }
}

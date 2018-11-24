-- MySQL Script generated by MySQL Workbench
-- Wed Nov 14 08:44:01 2018
-- Model: New Model    Version: 1.0
-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema chatbot
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema chatbot
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `chatbot` DEFAULT CHARACTER SET utf8 ;
-- -----------------------------------------------------
-- Schema new_schema1
-- -----------------------------------------------------
USE `chatbot` ;

-- -----------------------------------------------------
-- Table `chatbot`.`Relatii`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `chatbot`.`Relatii` ;

CREATE TABLE IF NOT EXISTS `chatbot`.`Relatii` (
  `Subiect` VARCHAR(20) NOT NULL,
  `Predicat` VARCHAR(45) NOT NULL,
  `Complement` VARCHAR(45) NOT NULL,
  `id` INT NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;

-- -----------------------------------------------------
-- Data for table `chatbot`.`Relatii`
-- -----------------------------------------------------
START TRANSACTION;
USE `chatbot`;
INSERT INTO `chatbot`.`Relatii` (`Subiect`, `Predicat`, `Complement`, `id`) VALUES ('Albastru', 'este', 'culoare', 1);
INSERT INTO `chatbot`.`Relatii` (`Subiect`, `Predicat`, `Complement`, `id`) VALUES ('Sur', 'este', 'culoare', 2);
INSERT INTO `chatbot`.`Relatii` (`Subiect`, `Predicat`, `Complement`, `id`) VALUES ('Cerul', 'are', 'culoare', 3);

COMMIT;

